const { verifyToken } = require("../utils/jwt");

/**
 * Middleware that verifies the JWT from the Authorization header.
 * Sets req.user = { id, email, role } on success.
 */
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

module.exports = authMiddleware;
