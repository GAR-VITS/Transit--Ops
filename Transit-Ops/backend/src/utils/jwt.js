const jwt = require("jsonwebtoken");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config/env");

/**
 * Generate a JWT token containing the user's id, email, and role.
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify and decode a JWT token.
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { generateToken, verifyToken };
