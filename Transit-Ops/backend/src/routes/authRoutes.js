const router = require("express").Router();
const { signup, login, me } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");

router.post("/signup", validateRequest(["name", "email", "password"]), signup);
router.post("/login", validateRequest(["email", "password"]), login);
router.get("/me", authMiddleware, me);

module.exports = router;
