const prisma = require("../config/db");
const { hashPassword } = require("../utils/bcrypt");
const { createNotification } = require("../services/notificationService");

async function getAll(req, res, next) {
  try {
    const where = { role: "DRIVER" };
    if (req.user.role === "DRIVER") {
      where.id = req.user.id;
    }
    const drivers = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(drivers);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    if (req.user.role === "DRIVER" && req.user.id !== req.params.id) {
      return res.status(403).json({ error: "Forbidden. Can only view own profile." });
    }
    const driver = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { tripsAsDriver: { orderBy: { scheduledDate: "desc" }, take: 10 } },
    });
    if (!driver || driver.role !== "DRIVER") {
      return res.status(404).json({ error: "Driver not found." });
    }
    const { password, ...safe } = driver;
    res.json(safe);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    if (req.user.role === "DRIVER") {
      return res.status(403).json({ error: "Forbidden. Drivers cannot create drivers." });
    }
    const { name, email, password, phone, licenseNumber, licenseCategory, licenseExpiry } = req.body;
    const hashed = await hashPassword(password);
    
    const driverData = { name, email, password: hashed, phone, role: "DRIVER" };
    
    if (licenseNumber && licenseCategory && licenseExpiry) {
      driverData.driverProfile = {
        create: {
          licenseNumber,
          licenseCategory,
          licenseExpiry: new Date(licenseExpiry),
        }
      };
    }

    const driver = await prisma.user.create({
      data: driverData,
      include: { driverProfile: true }
    });
    const { password: _, ...safe } = driver;
    res.status(201).json(safe);
  } catch (err) {
    if (err.code === "P2002") {
      if (err.meta?.target?.includes("email")) {
        return res.status(400).json({ error: "Email already exists." });
      }
      if (err.meta?.target?.includes("licenseNumber")) {
        return res.status(400).json({ error: "License number already exists." });
      }
      return res.status(400).json({ error: "Unique constraint failed." });
    }
    next(err);
  }
}

async function update(req, res, next) {
  try {
    if (req.user.role === "DRIVER" && req.user.id !== req.params.id) {
      return res.status(403).json({ error: "Forbidden. Can only edit own profile." });
    }
    const data = { ...req.body };
    
    const licenseNumber = data.licenseNumber;
    const licenseCategory = data.licenseCategory;
    const licenseExpiry = data.licenseExpiry;
    delete data.licenseNumber;
    delete data.licenseCategory;
    delete data.licenseExpiry;

    if (req.user.role === "DRIVER") {
      delete data.role;
      delete data.isActive;
      delete data.isApproved;
    }
    
    if (data.password) {
      data.password = await hashPassword(data.password);
    }

    if (licenseNumber && licenseCategory && licenseExpiry) {
      data.driverProfile = {
        upsert: {
          create: {
            licenseNumber,
            licenseCategory,
            licenseExpiry: new Date(licenseExpiry),
          },
          update: {
            licenseNumber,
            licenseCategory,
            licenseExpiry: new Date(licenseExpiry),
          }
        }
      };
    }

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });

    const driver = await prisma.user.update({
      where: { id: req.params.id },
      data,
      include: { driverProfile: true }
    });

    if (existing && existing.isActive === true && driver.isActive === false) {
      createNotification({
        targetRole: "SAFETY_OFFICER",
        type: "DRIVER_SUSPENDED",
        message: `${driver.name} marked Suspended`,
        relatedEntityId: driver.id
      });
      createNotification({
        targetRole: "MANAGER",
        type: "DRIVER_SUSPENDED",
        message: `${driver.name} marked Suspended`,
        relatedEntityId: driver.id
      });
    }

    const { password, ...safe } = driver;
    res.json(safe);
  } catch (err) {
    if (err.code === "P2002") {
      if (err.meta?.target?.includes("email")) {
        return res.status(400).json({ error: "Email already exists." });
      }
      if (err.meta?.target?.includes("licenseNumber")) {
        return res.status(400).json({ error: "License number already exists." });
      }
      return res.status(400).json({ error: "Unique constraint failed." });
    }
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    if (req.user.role === "DRIVER") {
      return res.status(403).json({ error: "Forbidden." });
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: "Driver deleted." });
  } catch (err) {
    next(err);
  }
}

async function onboard(req, res, next) {
  try {
    const currentUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { role: true } });
    if (!currentUser || currentUser.role !== "DRIVER") {
      return res.status(403).json({ error: "Only drivers can onboard." });
    }
    const { licenseNumber, licenseCategory, licenseExpiry, photoData } = req.body;
    
    const existing = await prisma.driverProfile.findUnique({
      where: { userId: req.user.id }
    });
    
    if (existing) {
      return res.status(400).json({ error: "Onboarding already completed." });
    }

    const profile = await prisma.driverProfile.create({
      data: {
        userId: req.user.id,
        licenseNumber,
        licenseCategory,
        licenseExpiry: new Date(licenseExpiry),
        photoData
      }
    });

    res.status(201).json(profile);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "License number already exists." });
    }
    next(err);
  }
}

module.exports = { getAll, getById, create, update, remove, onboard };
