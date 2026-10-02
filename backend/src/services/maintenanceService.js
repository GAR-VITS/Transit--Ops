const prisma = require("../config/db");

async function startMaintenance(vehicleId) {
  return prisma.vehicle.update({
    where: { id: vehicleId },
    data: { status: "IN_SHOP" },
  });
}

async function endMaintenance(vehicleId) {
  return prisma.vehicle.update({
    where: { id: vehicleId },
    data: { status: "AVAILABLE" },
  });
}

module.exports = { startMaintenance, endMaintenance };
