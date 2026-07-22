const app = require("./app");
const { PORT, NODE_ENV } = require("./config/env");

app.listen(PORT, () => {
  console.log(`\n🚀 TransitOps API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${NODE_ENV}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});
