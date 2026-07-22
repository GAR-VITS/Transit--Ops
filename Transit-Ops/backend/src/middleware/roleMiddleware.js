const permissions = require('../config/permissions');

/**
 * RBAC middleware factory.
 * Usage: roleMiddleware("VEHICLES", "READ")
 * Only allows users whose role is permitted for the entity and action.
 */
function roleMiddleware(entity, action) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated." });
    }

    const entityPerms = permissions[entity];
    if (!entityPerms) {
      console.warn(`No permissions defined for entity: ${entity}`);
      return res.status(403).json({ error: "Forbidden. Invalid entity." });
    }

    const allowedRoles = entityPerms[action] || [];
    if (!allowedRoles.includes(req.user.role)) {
      console.log(`[RBAC 403] User Role: ${req.user.role}, Entity: ${entity}, Action: ${action}, Allowed: ${allowedRoles}`);
      return res
        .status(403)
        .json({ error: "Forbidden. Insufficient permissions." });
    }

    next();
  };
}

module.exports = roleMiddleware;
