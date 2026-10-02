const prisma = require("../config/db");

const SERVICE_INTERVAL_KM = {
  Truck: 12000,
  Bus: 12000,
  Van: 10000,
  Car: 8000,
  Bike: 4000,
};
const DEFAULT_SERVICE_INTERVAL = 10000;

async function calculateRiskScore(vehicleId) {
  const now = new Date();

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true, registrationNo: true, currentMileage: true, status: true, make: true, model: true, type: true },
  });
  if (!vehicle) return null;

  const lastService = await prisma.maintenanceLog.findFirst({
    where: { vehicleId },
    orderBy: { startDate: "desc" },
    select: { mileageAtService: true, startDate: true },
  });

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const tripCount = await prisma.trip.count({
    where: {
      vehicleId,
      scheduledDate: { gte: thirtyDaysAgo },
      status: { notIn: ["CANCELLED"] },
    },
  });

  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const pastMaintenanceCount = await prisma.maintenanceLog.count({
    where: {
      vehicleId,
      startDate: { gte: sixMonthsAgo },
    },
  });

  const serviceIntervalKm = SERVICE_INTERVAL_KM[vehicle.type] || DEFAULT_SERVICE_INTERVAL;
  const currentOdometer = vehicle.currentMileage || 0;
  const lastServiceOdometer = lastService?.mileageAtService || 0;
  const odometerSinceService = currentOdometer - lastServiceOdometer;
  const odometerFactor = Math.min(Math.max(odometerSinceService / serviceIntervalKm, 0), 1.0);

  const lastServiceDate = lastService?.startDate || null;
  let daysFactor = 1.0;
  if (lastServiceDate) {
    const diffMs = now.getTime() - new Date(lastServiceDate).getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    daysFactor = Math.min(Math.max(diffDays / 120, 0), 1.0);
  }

  const tripFrequencyFactor = Math.min(Math.max(tripCount / 40, 0), 1.0);

  const pastMaintenanceFactor = Math.min(Math.max(pastMaintenanceCount / 3, 0), 1.0);

  const rawScore =
    odometerFactor * 0.4 +
    daysFactor * 0.25 +
    tripFrequencyFactor * 0.2 +
    pastMaintenanceFactor * 0.15;

  const riskScore = Math.round(rawScore * 100);

  let riskBand;
  if (riskScore <= 40) riskBand = "Low";
  else if (riskScore <= 70) riskBand = "Medium";
  else riskBand = "High";

  return {
    vehicleId: vehicle.id,
    registrationNo: vehicle.registrationNo,
    make: vehicle.make,
    model: vehicle.model,
    type: vehicle.type,
    riskScore,
    riskBand,
    factors: {
      odometerSinceService: {
        value: Math.round(odometerSinceService),
        factor: Math.round(odometerFactor * 100),
        label: `Odometer since service (${serviceIntervalKm / 1000}k interval)`,
        weight: 40,
      },
      daysSinceService: {
        value: lastServiceDate
          ? Math.round((now.getTime() - new Date(lastServiceDate).getTime()) / (1000 * 60 * 60 * 24))
          : null,
        factor: Math.round(daysFactor * 100),
        label: "Days since service (120d threshold)",
        weight: 25,
      },
      tripFrequency: {
        value: tripCount,
        factor: Math.round(tripFrequencyFactor * 100),
        label: "Trip frequency (40 trips / 30d)",
        weight: 20,
      },
      pastMaintenance: {
        value: pastMaintenanceCount,
        factor: Math.round(pastMaintenanceFactor * 100),
        label: "Past maintenance (3+ in 6mo)",
        weight: 15,
      },
    },
  };
}

async function getAllVehicleRisks() {
  const vehicles = await prisma.vehicle.findMany({
    where: { status: { notIn: ["RETIRED"] } },
    select: { id: true },
  });

  const results = [];
  for (const v of vehicles) {
    const score = await calculateRiskScore(v.id);
    if (score) results.push(score);
  }

  results.sort((a, b) => b.riskScore - a.riskScore);
  return results;
}

module.exports = { calculateRiskScore, getAllVehicleRisks };
