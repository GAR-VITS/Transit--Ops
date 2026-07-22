// Vehicle-specific business logic placeholder.

const prisma = require("../config/db");

/**
 * Get vehicles due for insurance renewal (within next 30 days).
 */
async function getExpiringInsurance(daysAhead = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);

  return prisma.vehicle.findMany({
    where: {
      insuranceExpiry: { lte: cutoff },
      status: { not: "RETIRED" },
    },
    orderBy: { insuranceExpiry: "asc" },
  });
}

module.exports = { getExpiringInsurance };
