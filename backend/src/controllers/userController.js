const prisma = require("../config/db");
const { hashPassword } = require("../utils/bcrypt");
const { createNotification } = require("../services/notificationService");

async function getAll(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, phone: true, isActive: true, isApproved: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true, email: true, role: true, phone: true, isActive: true, isApproved: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { name, email, password, role, phone } = req.body;
    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role, phone },
    });
    const { password: _, ...safe } = user;
    res.status(201).json(safe);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Email already exists." });
    }
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = { ...req.body };
    if (data.password) {
      data.password = await hashPassword(data.password);
    }
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
    });

    if (existing && data.role && existing.role !== data.role) {
      createNotification({
        userId: user.id,
        type: "ROLE_ASSIGNED",
        message: `Your role has been set to ${user.role}`,
        relatedEntityId: user.id
      });
    }

    const { password, ...safe } = user;
    res.json(safe);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: "User deleted." });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAll, getById, create, update, remove };
