const router = require("express").Router();
const ctrl = require("../controllers/vehicleController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.use(authMiddleware);

router.get("/", roleMiddleware("VEHICLES", "READ"), ctrl.getAll);
router.get("/:id", roleMiddleware("VEHICLES", "READ"), ctrl.getById);
router.post("/", roleMiddleware("VEHICLES", "WRITE"), ctrl.create);
router.put("/:id", roleMiddleware("VEHICLES", "WRITE"), ctrl.update);
router.delete("/:id", roleMiddleware("VEHICLES", "WRITE"), ctrl.remove);

module.exports = router;
