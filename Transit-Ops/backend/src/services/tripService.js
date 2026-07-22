// Business logic for trip status transitions
// Currently handled inline in tripController — this file
// provides a place to extract complex logic as the app grows.

const prisma = require("../config/db");

/**
 * Dispatch a trip — set status to IN_PROGRESS and vehicle to ON_TRIP.
 */
async function dispatchTrip(tripId) {
  const trip = await prisma.trip.update({
    where: { id: tripId },
    data: { status: "IN_PROGRESS", startTime: new Date() },
  });

  await prisma.vehicle.update({
    where: { id: trip.vehicleId },
    data: { status: "ON_TRIP" },
  });

  return trip;
}

/**
 * Complete a trip — set status to COMPLETED and vehicle back to AVAILABLE.
 */
async function completeTrip(tripId, distance) {
  const trip = await prisma.trip.update({
    where: { id: tripId },
    data: { status: "COMPLETED", endTime: new Date(), distance },
  });

  await prisma.vehicle.update({
    where: { id: trip.vehicleId },
    data: { status: "AVAILABLE" },
  });

  return trip;
}

/**
 * Cancel a trip.
 */
async function cancelTrip(tripId) {
  const trip = await prisma.trip.update({
    where: { id: tripId },
    data: { status: "CANCELLED" },
  });

  await prisma.vehicle.update({
    where: { id: trip.vehicleId },
    data: { status: "AVAILABLE" },
  });

  return trip;
}

module.exports = { dispatchTrip, completeTrip, cancelTrip };
