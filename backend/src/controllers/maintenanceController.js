const prisma = require("../config/db");
const permissions = require("../config/permissions");
const { getAllVehicleRisks } = require("../services/maintenanceRiskService");
const { createNotification } = require("../services/notificationService");

function stripCost(log, role) {
  const canSeeCost = permissions.MAINTENANCE.READ_COST.includes(role);
  if (!canSeeCost && log) {
    delete log.cost;
  }
  return log;
}

async function getAll(req, res, next) {
  try {
    let where = {};
    if (req.user.role === "DRIVER") {
      const trips = await prisma.trip.findMany({
        where: { driverId: req.user.id },
        select: { vehicleId: true },
        distinct: ['vehicleId']
      });
      where.vehicleId = { in: trips.map(t => t.vehicleId) };
    }
    const logs = await prisma.maintenanceLog.findMany({
      where,
      include: { vehicle: { select: { registrationNo: true, make: true, model: true } } },
      orderBy: { startDate: "desc" },
    });
    res.json(logs.map(log => stripCost(log, req.user.role)));
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const log = await prisma.maintenanceLog.findUnique({
      where: { id: req.params.id },
      include: { vehicle: true },
    });
    if (!log) return res.status(404).json({ error: "Maintenance log not found." });
    
    if (req.user.role === "DRIVER") {
      const trip = await prisma.trip.findFirst({ where: { driverId: req.user.id, vehicleId: log.vehicleId } });
      if (!trip) return res.status(403).json({ error: "Forbidden. Not assigned to this vehicle." });
    }
    
    res.json(stripCost(log, req.user.role));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const log = await prisma.maintenanceLog.create({ data: req.body });

    await prisma.vehicle.update({
      where: { id: log.vehicleId },
      data: { status: "IN_SHOP" },
    });

    createNotification({
      targetRole: "MANAGER",
      type: "VEHICLE_MAINTENANCE",
      message: `Vehicle ${log.vehicleId.slice(0, 8)} marked In Shop for ${log.serviceType}`,
      relatedEntityId: log.vehicleId
    });
    createNotification({
      targetRole: "FINANCIAL_ANALYST",
      type: "VEHICLE_MAINTENANCE",
      message: `Vehicle ${log.vehicleId.slice(0, 8)} marked In Shop for ${log.serviceType}`,
      relatedEntityId: log.vehicleId
    });

    res.status(201).json(log);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const log = await prisma.maintenanceLog.update({
      where: { id: req.params.id },
      data: req.body,
    });

    if (req.body.endDate) {
      await prisma.vehicle.update({
        where: { id: log.vehicleId },
        data: { status: "AVAILABLE" },
      });
    }

    res.json(log);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await prisma.maintenanceLog.delete({ where: { id: req.params.id } });
    res.json({ message: "Maintenance log deleted." });
  } catch (err) {
    next(err);
  }
}

async function getRiskScores(req, res, next) {
  try {
    const scores = await getAllVehicleRisks();
    res.json(scores);
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getById, create, update, remove, getRiskScores };
