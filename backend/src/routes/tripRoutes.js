const router = require("express").Router();
const ctrl = require("../controllers/tripController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.use(authMiddleware);

router.get("/", roleMiddleware("TRIPS", "READ"), ctrl.getAll);
router.get("/:id", roleMiddleware("TRIPS", "READ"), ctrl.getById);
router.post("/", roleMiddleware("TRIPS", "WRITE"), ctrl.create);
router.put("/:id", roleMiddleware("TRIPS", "WRITE"), ctrl.update);
router.delete("/:id", roleMiddleware("TRIPS", "WRITE"), ctrl.remove);

module.exports = router;
