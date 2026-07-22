const router = require("express").Router();
const ctrl = require("../controllers/geocodeController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.get("/search", ctrl.search);
router.get("/reverse", ctrl.reverse);
router.post("/route", ctrl.calculateRoute);

module.exports = router;
