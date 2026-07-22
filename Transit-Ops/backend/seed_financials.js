const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const vehicles = await prisma.vehicle.findMany();
  if (vehicles.length === 0) {
    console.log("No vehicles found. Cannot seed financials.");
    return;
  }

  console.log(`Seeding data for ${vehicles.length} vehicles...`);
  
  const today = new Date();
  
  // Seed past 60 days
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    d.setHours(12, 0, 0, 0);

    for (const v of vehicles) {
      // 30% chance for fuel expense
      if (Math.random() < 0.3) {
        await prisma.fuelExpense.create({
          data: {
            vehicleId: v.id,
            date: d,
            litres: 20 + Math.random() * 50, // 20-70 liters
            costPerLitre: 100, // Fixed approx price
            totalCost: (20 + Math.random() * 50) * 100,
            odometer: v.currentMileage + Math.floor(Math.random() * 100),
            fuelStation: "Indian Oil",
            proofImage: "fakeBase64",
          }
        });
      }

      // 10% chance for maintenance log
      if (Math.random() < 0.1) {
        await prisma.maintenanceLog.create({
          data: {
            vehicleId: v.id,
            type: "PREVENTIVE",
            description: "General Service",
            cost: 2000 + Math.random() * 8000, // 2000-10000
            startDate: d,
          }
        });
      }
      
      // 40% chance for a trip (completed) to generate ROI/Revenue
      if (Math.random() < 0.4) {
        await prisma.trip.create({
          data: {
            vehicleId: v.id,
            origin: "City A",
            destination: "City B",
            distance: 50 + Math.random() * 450, // 50-500 km
            cargoWeight: 1000 + Math.random() * 4000,
            scheduledDate: d,
            startTime: d,
            endTime: new Date(d.getTime() + 4 * 60 * 60 * 1000), // + 4 hours
            status: "COMPLETED",
          }
        });
      }
    }
  }

  console.log("Seeding financials completed.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
