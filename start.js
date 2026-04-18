const { execSync } = require("child_process");
const fs = require("fs");

console.log("=== Starting RSS Bot Dashboard ===");

const PROD_DEPS = [
  "@google-cloud/translate@^8.5.0",
  "bcrypt@^5.1.1",
  "child_process@^1.0.2",
  "dotenv@^16.4.7",
  "express@^4.21.2",
  "express-session@^1.18.1",
  "rss-parser@^3.13.0",
  "session-file-store@^1.5.0",
  "telegraf@^4.16.3",
  "tree-kill@^1.2.2",
];

const DEV_DEPS = [
  "@types/bcrypt@^5.0.2",
  "@types/cookie-parser@^1.4.8",
  "@types/express@^5.0.0",
  "@types/express-session@^1.18.1",
  "@types/node@^22.13.4",
  "@types/session-file-store@^1.2.5",
  "cross-env@^7.0.3",
  "ts-node-dev@^2.0.0",
  "tsc-alias@^1.8.10",
  "tsconfig-paths@^4.2.0",
  "typescript@^5.7.3",
];

function runCommand(command, description) {
  try {
    console.log(description);
    execSync(command, { stdio: "inherit" });
    return true;
  } catch (error) {
    console.error(`Failed: ${description}`);
    return false;
  }
}

function cleanInstall() {
  console.log("Cleaning node_modules and cache...");
  try {
    if (fs.existsSync("node_modules")) {
      fs.rmSync("node_modules", { recursive: true, force: true });
    }
    if (fs.existsSync("package-lock.json")) {
      fs.unlinkSync("package-lock.json");
    }
  } catch (err) {
    console.error("Error cleaning:", err.message);
  }

  try {
    execSync("npm cache clean --force", { stdio: "inherit" });
  } catch (err) {
    console.log("Cache clean skipped");
  }

  console.log("Installing production dependencies...");
  if (
    !runCommand(
      `npm install --save --no-audit --no-fund ${PROD_DEPS.join(" ")}`,
      "Installing production dependencies...",
    )
  ) {
    return false;
  }

  console.log("Installing dev dependencies...");
  return runCommand(
    `npm install --save-dev --no-audit --no-fund ${DEV_DEPS.join(" ")}`,
    "Installing dev dependencies...",
  );
}

function buildProject() {
  return runCommand("npm run build", "Building project...");
}

function startServer() {
  console.log("Starting server...");
  require("./dist/server.js");
}

// Main execution
(async () => {
  // Check if node_modules exists
  if (!fs.existsSync("node_modules")) {
    console.log("node_modules not found, installing all dependencies...");
    if (!cleanInstall()) {
      process.exit(1);
    }
  }

  // Try to build
  if (!buildProject()) {
    console.log("Build failed, attempting clean install...");
    if (!cleanInstall() || !buildProject()) {
      console.error("Build failed after clean install, exiting...");
      process.exit(1);
    }
  }

  // Check if dist/server.js exists
  if (!fs.existsSync("dist/server.js")) {
    console.error("dist/server.js not found after build, exiting...");
    process.exit(1);
  }

  // Start the server
  try {
    startServer();
  } catch (error) {
    console.error("Server crashed:", error.message);
    console.log("Attempting recovery with clean install...");
    if (cleanInstall() && buildProject()) {
      console.log("Restarting server...");
      startServer();
    } else {
      process.exit(1);
    }
  }
})();
