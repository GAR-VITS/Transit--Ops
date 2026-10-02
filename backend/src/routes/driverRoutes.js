const router = require("express").Router();
const ctrl = require("../controllers/driverController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.use(authMiddleware);

router.get("/", roleMiddleware("DRIVERS", "READ"), ctrl.getAll);
router.get("/:id", roleMiddleware("DRIVERS", "READ"), ctrl.getById);
router.post("/", roleMiddleware("DRIVERS", "WRITE"), ctrl.create);
router.post("/onboard", ctrl.onboard);
router.put("/:id", roleMiddleware("DRIVERS", "WRITE"), ctrl.update);
router.delete("/:id", roleMiddleware("DRIVERS", "WRITE"), ctrl.remove);

module.exports = router;
