const prisma = require("../config/db");
const { createNotification } = require("../services/notificationService");

// GET /api/fuel-expenses
async function getAll(req, res, next) {
  try {
    let where = {};
    if (req.user.role === "DRIVER") {
      where.userId = req.user.id;
    }
    const expenses = await prisma.fuelExpense.findMany({
      where,
      include: { vehicle: { select: { registrationNo: true, make: true, model: true } } },
      orderBy: { date: "desc" },
    });
    res.json(expenses);
  } catch (err) {
    next(err);
  }
}

// GET /api/fuel-expenses/:id
async function getById(req, res, next) {
  try {
    const expense = await prisma.fuelExpense.findUnique({
      where: { id: req.params.id },
      include: { vehicle: true },
    });
    if (!expense) return res.status(404).json({ error: "Fuel expense not found." });
    
    if (req.user.role === "DRIVER" && expense.userId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden. Can only view own fuel logs." });
    }
    
    res.json(expense);
  } catch (err) {
    next(err);
  }
}

// POST /api/fuel-expenses
async function create(req, res, next) {
  try {
    if (!req.body.proofImage) {
      return res.status(400).json({ error: "Proof image is required." });
    }
    const data = {
      ...req.body,
      totalCost: req.body.totalCost || req.body.litres * req.body.costPerLitre,
      proofImage: req.body.proofImage || null,
      userId: req.user.id // Track the creator
    };
    const expense = await prisma.fuelExpense.create({ data });

    // Update vehicle odometer
    if (data.odometer) {
      await prisma.vehicle.update({
        where: { id: data.vehicleId },
        data: { currentMileage: data.odometer },
      });
    }

    createNotification({
      targetRole: "MANAGER",
      type: "FUEL_LOGGED",
      message: `Fuel expense logged for Vehicle ${data.vehicleId.slice(0, 8)} — ₹${data.totalCost}`,
      relatedEntityId: data.vehicleId
    });
    createNotification({
      targetRole: "FINANCIAL_ANALYST",
      type: "FUEL_LOGGED",
      message: `Fuel expense logged for Vehicle ${data.vehicleId.slice(0, 8)} — ₹${data.totalCost}`,
      relatedEntityId: data.vehicleId
    });

    res.status(201).json(expense);
  } catch (err) {
    next(err);
  }
}

// PUT /api/fuel-expenses/:id
async function update(req, res, next) {
  try {
    const existing = await prisma.fuelExpense.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Fuel expense not found." });
    
    if (req.user.role === "DRIVER" && existing.userId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden. Can only edit own fuel logs." });
    }

    if (req.body.proofImage === null || req.body.proofImage === "") {
      return res.status(400).json({ error: "Proof image is required." });
    }

    const data = { ...req.body };
    // ensure we don't accidentally wipe it
    if (data.proofImage === undefined) delete data.proofImage;
    if (req.user.role === "DRIVER") {
      delete data.userId;
    }

    const expense = await prisma.fuelExpense.update({
      where: { id: req.params.id },
      data,
    });
    res.json(expense);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/fuel-expenses/:id
async function remove(req, res, next) {
  try {
    const existing = await prisma.fuelExpense.findUnique({ where: { id: req.params.id } });
    if (req.user.role === "DRIVER" && existing && existing.userId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden." });
    }
    await prisma.fuelExpense.delete({ where: { id: req.params.id } });
    res.json({ message: "Fuel expense deleted." });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getById, create, update, remove };
