const express = require("express");
const router = express.Router();
const configController = require("../controllers/configController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// All config routes require authentication
router.use(authMiddleware);

router.get("/fuel-price", configController.getFuelPrice);

// Admin / Manager only
router.patch("/fuel-price", roleMiddleware(["ADMIN", "MANAGER"]), configController.updateFuelPrice);

module.exports = router;
