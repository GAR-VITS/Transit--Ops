const prisma = require("../config/db");

// GET /api/config/fuel-price
async function getFuelPrice(req, res, next) {
  try {
    let config = await prisma.systemConfig.findUnique({
      where: { key: "fuelPricePerLiter" },
    });

    if (!config) {
      config = await prisma.systemConfig.create({
        data: { key: "fuelPricePerLiter", value: "130" },
      });
    }

    res.json({ fuelPricePerLiter: parseFloat(config.value) });
  } catch (err) {
    // If DB fails, fallback safely
    console.error("Failed to fetch fuel price config:", err.message);
    res.json({ fuelPricePerLiter: 130 });
  }
}

// PATCH /api/config/fuel-price
async function updateFuelPrice(req, res, next) {
  try {
    const { fuelPricePerLiter } = req.body;
    if (!fuelPricePerLiter || isNaN(fuelPricePerLiter)) {
      return res.status(400).json({ error: "Invalid fuel price" });
    }

    const config = await prisma.systemConfig.upsert({
      where: { key: "fuelPricePerLiter" },
      update: { value: String(fuelPricePerLiter) },
      create: { key: "fuelPricePerLiter", value: String(fuelPricePerLiter) },
    });

    res.json({ fuelPricePerLiter: parseFloat(config.value) });
  } catch (err) {
    next(err);
  }
}

module.exports = { getFuelPrice, updateFuelPrice };
