const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const errorHandler = require("./middleware/errorHandler");
const requireAuth = require("./middleware/authMiddleware");

// Route imports
const authRoutes = require("./routes/authRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const driverRoutes = require("./routes/driverRoutes");
const tripRoutes = require("./routes/tripRoutes");
const maintenanceRoutes = require("./routes/maintenanceRoutes");
const fuelExpenseRoutes = require("./routes/fuelExpenseRoutes");
const reportRoutes = require("./routes/reportRoutes");
const userRoutes = require("./routes/userRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const geocodeRoutes = require("./routes/geocodeRoutes");
const configRoutes = require("./routes/configRoutes");

const app = express();

// ─── Global middleware ──────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

// ─── Health check ───────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── API routes ─────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/fuel-expenses", fuelExpenseRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", requireAuth, notificationRoutes);
app.use("/api/geocode", geocodeRoutes);
app.use("/api/config", configRoutes);

// ─── 404 fallback ───────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// ─── Error handler ──────────────────────────────────────
app.use(errorHandler);

module.exports = app;
