require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  JWT_SECRET: process.env.JWT_SECRET || "fallback-secret",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
};
