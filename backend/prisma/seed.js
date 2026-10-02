const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
require("dotenv").config();

const prisma = new PrismaClient();

async function main() {
  console.log(" Seeding database...");

  const email = process.env.ADMIN_EMAIL || "admin@transitops.com";
  const password = process.env.ADMIN_PASSWORD || "Admin@123";

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { isApproved: true },
    create: {
      name: "System Admin",
      email,
      password: hashedPassword,
      role: "ADMIN",
      phone: "+1-000-000-0000",
      isApproved: true,
    },
  });

  console.log(` Admin account created: ${admin.email} (role: ${admin.role})`);

  const managerEmail = "manager@transitops.com";
  const manager = await prisma.user.upsert({
    where: { email: managerEmail },
    update: { isApproved: true },
    create: {
      name: "Fleet Manager",
      email: managerEmail,
      password: await bcrypt.hash("Manager@123", 10),
      role: "MANAGER",
      phone: "+1-111-111-1111",
      isApproved: true,
    },
  });
  console.log(` Manager account created: ${manager.email}`);

  const driverEmail = "driver@transitops.com";
  const driver = await prisma.user.upsert({
    where: { email: driverEmail },
    update: { isApproved: true },
    create: {
      name: "John Driver",
      email: driverEmail,
      password: await bcrypt.hash("Driver@123", 10),
      role: "DRIVER",
      phone: "+1-222-222-2222",
      isApproved: true,
    },
  });
  console.log(` Driver account created: ${driver.email}`);

  console.log("\n Seeding complete!");
  console.log("─────────────────────────────────────");
  console.log("Demo Credentials:");
  console.log(`  Admin   → ${email} / ${password}`);
  console.log(`  Manager → ${managerEmail} / Manager@123`);
  console.log(`  Driver  → ${driverEmail} / Driver@123`);
  console.log("─────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error(" Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
