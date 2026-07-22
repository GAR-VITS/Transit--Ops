/**
 * Generic request-body validation middleware.
 * Accepts an array of required field names and
 * returns 400 if any are missing from req.body.
 */
function validateRequest(requiredFields) {
  return (req, res, next) => {
    const missing = requiredFields.filter(
      (field) => req.body[field] === undefined || req.body[field] === ""
    );

    if (missing.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    next();
  };
}

module.exports = validateRequest;
