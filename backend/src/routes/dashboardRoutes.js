const router = require("express").Router();
const ctrl = require("../controllers/dashboardController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.use(authMiddleware);

router.get("/financial", roleMiddleware("REPORTS", "FINANCIAL"), ctrl.getFinancialDashboard);

router.get("/safety", roleMiddleware("REPORTS", "COMPLIANCE"), ctrl.getSafetyDashboard);

router.get("/admin", ctrl.getAdminDashboard);

module.exports = router;
