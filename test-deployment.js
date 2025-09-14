#!/usr/bin/env node

/**
 * Simple Deployment Test Runner
 *
 * Quick test runner for validating deployment from project root
 */

const { spawn } = require("child_process");
const path = require("path");

async function runCommand(command, args, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Running: ${command} ${args.join(" ")}`);
    console.log(`📁 Directory: ${cwd}\n`);

    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: true,
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const backendUrl =
    args[0] || process.env.API_BASE_URL || "http://localhost:5001";
  const frontendUrl =
    args[1] || process.env.FRONTEND_URL || "http://localhost:3000";

  console.log("🧪 Campus Vibe Deployment Testing Suite");
  console.log("=".repeat(50));
  console.log(`🔧 Backend URL: ${backendUrl}`);
  console.log(`🎨 Frontend URL: ${frontendUrl}`);
  console.log(`📅 Started: ${new Date().toISOString()}\n`);

  try {
    // Test 1: Backend deployment tests
    console.log("📋 Step 1: Running backend deployment tests...");
    await runCommand("node", ["server/tests/deployment-tests.js", backendUrl]);
    console.log("✅ Backend tests completed\n");

    // Test 2: Production health checks
    console.log("📋 Step 2: Running production health checks...");
    await runCommand("node", [
      "scripts/production-health-check.js",
      backendUrl,
    ]);
    console.log("✅ Production health checks completed\n");

    // Test 3: Comprehensive validation
    console.log("📋 Step 3: Running comprehensive validation...");
    await runCommand("node", [
      "scripts/validate-deployment.js",
      backendUrl,
      frontendUrl,
    ]);
    console.log("✅ Comprehensive validation completed\n");

    console.log("🎉 All deployment tests passed!");
    console.log("✅ Your application is ready for production use.");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Deployment tests failed:", error.message);
    console.log("\n💡 Troubleshooting tips:");
    console.log("   • Ensure both backend and frontend are running");
    console.log("   • Check that all environment variables are set correctly");
    console.log("   • Verify database connectivity");
    console.log("   • Review server logs for detailed error information");

    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Test runner failed:", error);
    process.exit(1);
  });
}
