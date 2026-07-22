const router = require("express").Router();
const ctrl = require("../controllers/reportController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.use(authMiddleware);

router.get("/summary", roleMiddleware("REPORTS", "FINANCIAL"), ctrl.getSummary);
router.get("/fleet-utilization", roleMiddleware("REPORTS", "FINANCIAL"), ctrl.getFleetUtilization);
router.get("/fuel-efficiency", roleMiddleware("REPORTS", "FINANCIAL"), ctrl.getFuelEfficiency);
router.get("/vehicle-roi", roleMiddleware("REPORTS", "FINANCIAL"), ctrl.getVehicleROI);
router.get("/export/:type", roleMiddleware("REPORTS", "EXPORT"), ctrl.exportCSV);

module.exports = router;
