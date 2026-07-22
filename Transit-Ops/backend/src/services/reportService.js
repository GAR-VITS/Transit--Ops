// Report-specific business logic (ROI, fuel efficiency, etc.).

const prisma = require("../config/db");

/**
 * Calculate simple ROI per vehicle.
 * ROI = (Revenue from trips - Total cost) / Total cost * 100
 * Since we don't track revenue, we use trip count as a proxy.
 */
async function calculateVehicleROI() {
  const vehicles = await prisma.vehicle.findMany({
    where: { status: { notIn: ["RETIRED"] } },
    include: {
      trips: {
        where: { status: "COMPLETED" },
        select: { revenue: true, distance: true },
      },
      maintenanceLogs: { select: { cost: true } },
      fuelExpenses: { select: { totalCost: true } },
    },
  });

  return vehicles.map((v) => {
    const totalRevenue = v.trips.reduce((s, t) => s + (t.revenue || 0), 0);
    const maintenanceCost = v.maintenanceLogs.reduce((s, m) => s + m.cost, 0);
    const fuelCost = v.fuelExpenses.reduce((s, f) => s + f.totalCost, 0);
    const acquisitionCost = v.purchaseCost || 0;
    const roi =
      acquisitionCost > 0
        ? ((totalRevenue - (maintenanceCost + fuelCost)) / acquisitionCost) * 100
        : 0;

    return {
      id: v.id,
      registrationNo: v.registrationNo,
      make: v.make,
      model: v.model,
      purchaseCost: acquisitionCost,
      maintenanceCost,
      fuelCost,
      totalRevenue,
      totalCost: acquisitionCost + maintenanceCost + fuelCost,
      roi: Math.round(roi * 10) / 10,
      tripCount: v.trips.length,
    };
  }).sort((a, b) => b.roi - a.roi);
}

module.exports = { calculateVehicleROI };
