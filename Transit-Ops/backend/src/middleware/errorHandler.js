/**
 * Global error-handling middleware.
 * Must have 4 params so Express recognises it as an error handler.
 */
function errorHandler(err, req, res, _next) {
  console.error("🔥 Error:", err.message);

  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message;

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}

module.exports = errorHandler;
