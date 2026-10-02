const prisma = require("../config/db");

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
