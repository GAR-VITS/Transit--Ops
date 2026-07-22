/**
 * Predictive Maintenance Risk Service
 * 
 * Calculates a Maintenance Risk Score (0-100) per vehicle using a weighted formula:
 *   - Odometer since last service (40%) — interval varies by vehicle type
 *   - Days since last service (25%)
 *   - Trip frequency in last 30 days (20%)
 *   - Past maintenance frequency in last 6 months (15%)
 */

const prisma = require("../config/db");

// ── Vehicle-type-specific service intervals (km) ─────────
// Heavy trucks need service every 12,000 km, vans every 10,000 km, etc.
const SERVICE_INTERVAL_KM = {
  Truck: 12000,
  Bus: 12000,
  Van: 10000,
  Car: 8000,
  Bike: 4000,
};
const DEFAULT_SERVICE_INTERVAL = 10000;

/**
 * Calculate risk score for a single vehicle.
 * @param {string} vehicleId
 * @returns {{ vehicleId, registrationNo, riskScore, riskBand, factors }}
 */
async function calculateRiskScore(vehicleId) {
  const now = new Date();

  // ── Fetch the vehicle ────────────────────────────────────
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true, registrationNo: true, currentMileage: true, status: true, make: true, model: true, type: true },
  });
  if (!vehicle) return null;

  // ── Last service (most recent maintenance log) ───────────
  const lastService = await prisma.maintenanceLog.findFirst({
    where: { vehicleId },
    orderBy: { startDate: "desc" },
    select: { mileageAtService: true, startDate: true },
  });

  // ── Trip count in last 30 days ────────────────────────────
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const tripCount = await prisma.trip.count({
    where: {
      vehicleId,
      scheduledDate: { gte: thirtyDaysAgo },
      status: { notIn: ["CANCELLED"] },
    },
  });

  // ── Maintenance records in last 6 months ──────────────────
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const pastMaintenanceCount = await prisma.maintenanceLog.count({
    where: {
      vehicleId,
      startDate: { gte: sixMonthsAgo },
    },
  });

  // ── Factor calculations ───────────────────────────────────
  
  // Odometer factor — uses vehicle-type-specific service interval
  const serviceIntervalKm = SERVICE_INTERVAL_KM[vehicle.type] || DEFAULT_SERVICE_INTERVAL;
  const currentOdometer = vehicle.currentMileage || 0;
  const lastServiceOdometer = lastService?.mileageAtService || 0;
  const odometerSinceService = currentOdometer - lastServiceOdometer;
  const odometerFactor = Math.min(Math.max(odometerSinceService / serviceIntervalKm, 0), 1.0);

  // Days factor — 120 day threshold
  const lastServiceDate = lastService?.startDate || null;
  let daysFactor = 1.0; // If no service record at all → highest risk
  if (lastServiceDate) {
    const diffMs = now.getTime() - new Date(lastServiceDate).getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    daysFactor = Math.min(Math.max(diffDays / 120, 0), 1.0);
  }

  // Trip frequency — 40 trips threshold
  const tripFrequencyFactor = Math.min(Math.max(tripCount / 40, 0), 1.0);

  // Past maintenance — 3+ records in 6 months = max risk
  const pastMaintenanceFactor = Math.min(Math.max(pastMaintenanceCount / 3, 0), 1.0);

  // ── Weighted score ────────────────────────────────────────
  const rawScore =
    odometerFactor * 0.4 +
    daysFactor * 0.25 +
    tripFrequencyFactor * 0.2 +
    pastMaintenanceFactor * 0.15;

  const riskScore = Math.round(rawScore * 100);

  // ── Risk band ─────────────────────────────────────────────
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

/**
 * Calculate risk scores for all non-retired vehicles, sorted by highest risk first.
 */
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

  // Sort by risk score descending (highest risk first)
  results.sort((a, b) => b.riskScore - a.riskScore);
  return results;
}

module.exports = { calculateRiskScore, getAllVehicleRisks };
