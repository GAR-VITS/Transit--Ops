const prisma = require("../config/db");
const { toCSV } = require("../utils/csvExport");

// GET /api/reports/summary
async function getSummary(req, res, next) {
  try {
    const [totalVehicles, totalDrivers, totalTrips, totalMaintenance] =
      await Promise.all([
        prisma.vehicle.count(),
        prisma.user.count({ where: { role: "DRIVER" } }),
        prisma.trip.count(),
        prisma.maintenanceLog.count(),
      ]);

    const fuelAgg = await prisma.fuelExpense.aggregate({
      _sum: { totalCost: true, litres: true },
    });

    const maintenanceAgg = await prisma.maintenanceLog.aggregate({
      _sum: { cost: true },
    });

    const completedTrips = await prisma.trip.count({ where: { status: "COMPLETED" } });

    res.json({
      totalVehicles,
      totalDrivers,
      totalTrips,
      completedTrips,
      totalMaintenance,
      totalFuelCost: fuelAgg._sum.totalCost || 0,
      totalFuelLitres: fuelAgg._sum.litres || 0,
      totalMaintenanceCost: maintenanceAgg._sum.cost || 0,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/fleet-utilization
async function getFleetUtilization(req, res, next) {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: { _count: { select: { trips: true } } },
    });

    const data = vehicles.map((v) => ({
      registrationNo: v.registrationNo,
      make: v.make,
      model: v.model,
      status: v.status,
      tripCount: v._count.trips,
    }));

    res.json(data);
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/fuel-efficiency
async function getFuelEfficiency(req, res, next) {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        fuelExpenses: { select: { litres: true, totalCost: true } },
        trips: { where: { status: "COMPLETED" }, select: { distance: true } },
      },
    });

    const data = vehicles.map((v) => {
      const totalLitres = v.fuelExpenses.reduce((s, f) => s + f.litres, 0);
      const totalDistance = v.trips.reduce((s, t) => s + (t.distance || 0), 0);
      const totalFuelCost = v.fuelExpenses.reduce((s, f) => s + f.totalCost, 0);
      return {
        registrationNo: v.registrationNo,
        make: v.make,
        model: v.model,
        totalDistance,
        totalLitres,
        totalFuelCost,
        kmPerLitre: totalLitres > 0 ? (totalDistance / totalLitres).toFixed(2) : "N/A",
      };
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/export/:type  (csv download)
async function exportCSV(req, res, next) {
  try {
    const { type } = req.params;
    let data = [];

    switch (type) {
      case "vehicles":
        data = await prisma.vehicle.findMany();
        break;
      case "trips":
        data = await prisma.trip.findMany({ include: { vehicle: true, driver: true } });
        break;
      case "maintenance":
        data = await prisma.maintenanceLog.findMany({ include: { vehicle: true } });
        break;
      case "fuel":
        data = await prisma.fuelExpense.findMany({ include: { vehicle: true } });
        break;
      default:
        return res.status(400).json({ error: "Invalid export type." });
    }

    const csv = toCSV(data);
    res.header("Content-Type", "text/csv");
    res.attachment(`${type}_report.csv`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/vehicle-roi
async function getVehicleROI(req, res, next) {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { status: { notIn: ["RETIRED"] } },
      include: {
        trips: {
          where: { status: "COMPLETED" },
          select: { revenue: true, distance: true },
        },
        maintenanceLogs: {
          select: { cost: true },
        },
        fuelExpenses: {
          select: { totalCost: true },
        },
      },
    });

    const data = vehicles.map((v) => {
      const totalRevenue = v.trips.reduce((s, t) => s + (t.revenue || 0), 0);
      const totalMaintCost = v.maintenanceLogs.reduce((s, m) => s + m.cost, 0);
      const totalFuelCost = v.fuelExpenses.reduce((s, f) => s + f.totalCost, 0);
      const acquisitionCost = v.purchaseCost || 0;
      const roi =
        acquisitionCost > 0
          ? ((totalRevenue - (totalMaintCost + totalFuelCost)) / acquisitionCost) * 100
          : 0;

      return {
        vehicleId: v.id,
        registrationNo: v.registrationNo,
        make: v.make,
        model: v.model,
        type: v.type,
        totalRevenue: Math.round(totalRevenue),
        totalMaintCost: Math.round(totalMaintCost),
        totalFuelCost: Math.round(totalFuelCost),
        acquisitionCost: Math.round(acquisitionCost),
        roi: Math.round(roi * 10) / 10,
        completedTrips: v.trips.length,
      };
    });

    // Sort by ROI descending
    data.sort((a, b) => b.roi - a.roi);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { getSummary, getFleetUtilization, getFuelEfficiency, exportCSV, getVehicleROI };
