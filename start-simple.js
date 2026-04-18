const { execSync } = require("child_process");
const fs = require("fs");

console.log("=== Starting RSS Bot Dashboard ===");

// Check if dist/server.js exists
if (!fs.existsSync("dist/server.js")) {
  console.log("dist/server.js not found, building...");
  try {
    execSync("npm run build", { stdio: "inherit" });
  } catch (error) {
    console.error("Build failed:", error.message);
    process.exit(1);
  }
}

// Verify dist/server.js exists after build
if (!fs.existsSync("dist/server.js")) {
  console.error("dist/server.js still not found after build, exiting...");
  process.exit(1);
}

// Start the server
console.log("Starting server...");
require("./dist/server.js");
