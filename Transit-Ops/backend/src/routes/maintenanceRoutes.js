const router = require("express").Router();
const ctrl = require("../controllers/maintenanceController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.use(authMiddleware);

// Risk scores endpoint — accessible by any authenticated user (must come before /:id)
router.get("/risk-scores", ctrl.getRiskScores);

router.get("/", roleMiddleware("MAINTENANCE", "READ"), ctrl.getAll);
router.get("/:id", roleMiddleware("MAINTENANCE", "READ"), ctrl.getById);
router.post("/", roleMiddleware("MAINTENANCE", "WRITE"), ctrl.create);
router.put("/:id", roleMiddleware("MAINTENANCE", "WRITE"), ctrl.update);
router.delete("/:id", roleMiddleware("MAINTENANCE", "WRITE"), ctrl.remove);

module.exports = router;
