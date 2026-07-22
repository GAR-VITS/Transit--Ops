const prisma = require("../config/db");
const { createNotification } = require("../services/notificationService");
const { geocodeTripEndpoints } = require("../services/geocodingService");

// GET /api/trips
async function getAll(req, res, next) {
  try {
    const where = {};
    if (req.user.role === "DRIVER") {
      where.OR = [
        { driverId: req.user.id },
        { driverId: null, status: "DRAFT" }
      ];
    }
    const trips = await prisma.trip.findMany({
      where,
      include: {
        vehicle: { select: { registrationNo: true, make: true, model: true } },
        driver: { select: { id: true, name: true, email: true } },
      },
      orderBy: { scheduledDate: "desc" },
    });
    res.json(trips);
  } catch (err) {
    next(err);
  }
}

// GET /api/trips/:id
async function getById(req, res, next) {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: {
        vehicle: true,
        driver: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
    if (!trip) return res.status(404).json({ error: "Trip not found." });
    
    if (req.user.role === "DRIVER" && trip.driverId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden. Can only view own trips." });
    }
    
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

// POST /api/trips
async function create(req, res, next) {
  try {
    const data = req.body;
    if (req.user.role === "DRIVER") {
      // Drivers can only create trips for themselves
      data.driverId = req.user.id;
    }

    // Geocode origin and destination (best-effort, non-blocking on failure)
    try {
      const coords = await geocodeTripEndpoints(
        data.origin || "",
        data.destination || ""
      );
      data.sourceLat = coords.sourceLat;
      data.sourceLng = coords.sourceLng;
      data.destLat = coords.destLat;
      data.destLng = coords.destLng;
    } catch (geoErr) {
      console.warn("Geocoding failed (non-fatal):", geoErr.message);
      // Continue without coordinates — map will show fallback
    }

    const trip = await prisma.trip.create({
      data,
      include: { vehicle: true, driver: { select: { id: true, name: true } } },
    });

    // Mark vehicle as ON_TRIP if it's assigned to a trip
    if (trip.status === "IN_PROGRESS" || trip.status === "SCHEDULED" || trip.status === "DRAFT") {
      await prisma.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: "ON_TRIP" },
      });
    }

    if (trip.status === "IN_PROGRESS" || trip.status === "SCHEDULED") {
      createNotification({
        targetRole: "MANAGER",
        type: "TRIP_DISPATCHED",
        message: `Trip #${trip.id.slice(0, 8)} dispatched to ${trip.destination}`,
        relatedEntityId: trip.id
      });
      if (trip.driverId) {
        createNotification({
          userId: trip.driverId,
          type: "TRIP_DISPATCHED",
          message: `You have been dispatched for Trip #${trip.id.slice(0, 8)} to ${trip.destination}`,
          relatedEntityId: trip.id
        });
      }
    }

    res.status(201).json(trip);
  } catch (err) {
    next(err);
  }
}

// PUT /api/trips/:id  — also handles dispatch / complete / cancel
async function update(req, res, next) {
  try {
    const existing = await prisma.trip.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Trip not found." });

    if (req.user.role === "DRIVER" && existing.driverId !== req.user.id) {
      if (existing.driverId === null && existing.status === "DRAFT" && req.body.driverId === req.user.id) {
        // Driver is accepting an open trip
      } else {
        return res.status(403).json({ error: "Forbidden. Can only update own trips." });
      }
    }

    const data = { ...req.body };
    if (req.user.role === "DRIVER") {
      if (existing.driverId === null && existing.status === "DRAFT" && data.driverId === req.user.id) {
        // Driver is accepting an open trip, allow setting driverId and status
      } else {
        // Drivers cannot change the assigned driver of an already assigned trip
        delete data.driverId;
      }
    }

    // Extract fuel fields — these are NOT Trip model columns, so strip them before prisma.trip.update
    const fuelVolume = data.fuelVolume;
    const fuelCost = data.fuelCost;
    delete data.fuelVolume;
    delete data.fuelCost;

    // ── COMPLETED: wrap trip update + vehicle status + auto fuel-log in one transaction ──
    if (data.status === "COMPLETED") {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Update trip
        const trip = await tx.trip.update({
          where: { id: req.params.id },
          data,
        });

        // 2. Set vehicle back to AVAILABLE
        await tx.vehicle.update({
          where: { id: trip.vehicleId },
          data: { status: "AVAILABLE" },
        });

        // 3. Auto-create fuel log if fuel data was provided and volume > 0
        let fuelLog = null;
        if (fuelVolume && Number(fuelVolume) > 0 && fuelCost && Number(fuelCost) > 0) {
          const litres = Number(fuelVolume);
          const totalCost = Number(fuelCost);
          fuelLog = await tx.fuelExpense.create({
            data: {
              vehicleId: trip.vehicleId,
              userId: req.user.id,
              date: new Date(),
              litres,
              costPerLitre: litres > 0 ? totalCost / litres : 0,
              totalCost,
              odometer: trip.distance || 0,
              source: `Auto-logged from Trip #${trip.id.slice(0, 8)}`,
            },
          });
        }

        return { trip, fuelLog };
      });

      // Emit notifications
      createNotification({
        targetRole: "MANAGER",
        type: "TRIP_COMPLETED",
        message: `Trip #${result.trip.id.slice(0, 8)} completed — ${result.trip.distance || 0}km`,
        relatedEntityId: result.trip.id
      });
      createNotification({
        targetRole: "FINANCIAL_ANALYST",
        type: "TRIP_COMPLETED",
        message: `Trip #${result.trip.id.slice(0, 8)} completed — ${result.trip.distance || 0}km`,
        relatedEntityId: result.trip.id
      });

      return res.json(result.trip);
    }

    // ── Non-COMPLETED status updates (no transaction needed) ──
    const trip = await prisma.trip.update({
      where: { id: req.params.id },
      data,
    });

    // Status transitions → update vehicle status
    if (data.status === "IN_PROGRESS" || data.status === "SCHEDULED" || data.status === "DRAFT") {
      await prisma.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: "ON_TRIP" },
      });
    }
    if (data.status === "CANCELLED") {
      await prisma.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: "AVAILABLE" },
      });
    }

    if (data.status === "IN_PROGRESS" || data.status === "SCHEDULED") {
      createNotification({
        targetRole: "MANAGER",
        type: "TRIP_DISPATCHED",
        message: `Trip #${trip.id.slice(0, 8)} dispatched to ${trip.destination}`,
        relatedEntityId: trip.id
      });
      if (trip.driverId) {
        createNotification({
          userId: trip.driverId,
          type: "TRIP_DISPATCHED",
          message: `You have been dispatched for Trip #${trip.id.slice(0, 8)} to ${trip.destination}`,
          relatedEntityId: trip.id
        });
      }
    }

    res.json(trip);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/trips/:id
async function remove(req, res, next) {
  try {
    const existing = await prisma.trip.findUnique({ where: { id: req.params.id } });
    if (req.user.role === "DRIVER" && existing && existing.driverId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden." });
    }
    await prisma.trip.delete({ where: { id: req.params.id } });
    res.json({ message: "Trip deleted." });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getById, create, update, remove };
