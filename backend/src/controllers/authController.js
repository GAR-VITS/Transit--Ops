const prisma = require("../config/db");
const { hashPassword, comparePassword } = require("../utils/bcrypt");
const { generateToken } = require("../utils/jwt");

async function signup(req, res, next) {
  try {
    const { name, email, password, phone } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered." });
    }

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: { 
        name, 
        email, 
        password: hashed, 
        phone, 
        role: "UNASSIGNED", 
        isApproved: false 
      },
    });

    res.status(201).json({
      message: "Account created successfully. Please wait for an admin to approve your account.",
      user: { id: user.id, name: user.name, email: user.email, role: user.role, isApproved: user.isApproved },
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email }, include: { driverProfile: true } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Account is deactivated." });
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const token = generateToken(user);

    res.json({
      message: "Login successful.",
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, isApproved: user.isApproved, phone: user.phone, driverProfile: user.driverProfile },
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, phone: true, isActive: true, isApproved: true, driverProfile: true },
    });

    if (!user) return res.status(404).json({ error: "User not found." });

    const { generateToken } = require("../utils/jwt");
    const token = generateToken(user);

    res.json({ user, token });
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login, me };
