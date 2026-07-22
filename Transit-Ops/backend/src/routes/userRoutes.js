const router = require("express").Router();
const ctrl = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

router.use(authMiddleware);

router.get("/", roleMiddleware("USERS", "READ"), ctrl.getAll);
router.get("/:id", roleMiddleware("USERS", "READ"), ctrl.getById);
router.post("/", roleMiddleware("USERS", "WRITE"), ctrl.create);
router.put("/:id", roleMiddleware("USERS", "WRITE"), ctrl.update);
router.delete("/:id", roleMiddleware("USERS", "WRITE"), ctrl.remove);

module.exports = router;
