const router = require("express").Router();
const ctrl = require("../controllers/fuelExpenseController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.use(authMiddleware);

router.get("/", roleMiddleware("FUEL", "READ"), ctrl.getAll);
router.get("/:id", roleMiddleware("FUEL", "READ"), ctrl.getById);
router.post("/", roleMiddleware("FUEL", "WRITE"), ctrl.create);
router.put("/:id", roleMiddleware("FUEL", "WRITE"), ctrl.update);
router.delete("/:id", roleMiddleware("FUEL", "WRITE"), ctrl.remove);

module.exports = router;
