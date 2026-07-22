// Business logic for maintenance-related vehicle status updates.

const prisma = require("../config/db");

/**
 * Start maintenance — set vehicle to IN_SHOP.
 */
async function startMaintenance(vehicleId) {
  return prisma.vehicle.update({
    where: { id: vehicleId },
    data: { status: "IN_SHOP" },
  });
}

/**
 * End maintenance — set vehicle back to AVAILABLE.
 */
async function endMaintenance(vehicleId) {
  return prisma.vehicle.update({
    where: { id: vehicleId },
    data: { status: "AVAILABLE" },
  });
}

module.exports = { startMaintenance, endMaintenance };
