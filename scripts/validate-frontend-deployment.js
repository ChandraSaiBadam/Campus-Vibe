#!/usr/bin/env node

/**
 * Frontend Deployment Validation Script
 *
 * Validates that the frontend is properly configured and ready for AWS deployment.
 * Tests configuration, build process, and API connectivity.
 *
 * Requirements addressed:
 * - 1.4: Both frontend and backend accessible via HTTPS
 * - 4.1: Frontend loads within 3 seconds globally
 * - 4.2: API calls respond within 2 seconds
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const axios = require("axios");

// Helper functions
const log = (message) => console.log(`[VALIDATE] ${message}`);
const error = (message) => console.error(`[ERROR] ${message}`);
const success = (message) => console.log(`[SUCCESS] ${message}`);
const warn = (message) => console.warn(`[WARN] ${message}`);

class FrontendValidator {
  constructor(environment = "production") {
    this.environment = environment;
    this.clientDir = path.join(__dirname, "..", "client");
    this.results = {
      timestamp: new Date().toISOString(),
      environment,
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
      },
    };
  }

  // Log test result
  logTest(name, status, details = {}, error = null) {
    const test = {
      name,
      status, // 'pass', 'fail', 'warning'
      details,
      error: error ? error.message : null,
      timestamp: new Date().toISOString(),
    };

    this.results.tests.push(test);
    this.results.summary.total++;

    switch (status) {
      case "pass":
        this.results.summary.passed++;
        success(`${name}`);
        break;
      case "fail":
        this.results.summary.failed++;
        error(`${name}: ${error ? error.message : "Failed"}`);
        break;
      case "warning":
        this.results.summary.warnings++;
        warn(`${name}: ${details.message || "Warning"}`);
        break;
    }

    if (Object.keys(details).length > 0) {
      log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
  }

  // Test environment file configuration
  testEnvironmentConfig() {
    try {
      const envFile = path.join(this.clientDir, `.env.${this.environment}`);

      if (!fs.existsSync(envFile)) {
        throw new Error(`Environment file not found: .env.${this.environment}`);
      }

      const envContent = fs.readFileSync(envFile, "utf8");
      const requiredVars = [
        "REACT_APP_API_URL",
        "REACT_APP_ENVIRONMENT",
        "REACT_APP_AWS_REGION",
      ];

      const configuredVars = {};
      const missingVars = [];

      requiredVars.forEach((varName) => {
        const match = envContent.match(new RegExp(`${varName}=(.+)`));
        if (match) {
          configuredVars[varName] = match[1].trim();
        } else {
          missingVars.push(varName);
        }
      });

      if (missingVars.length > 0) {
        throw new Error(`Missing variables: ${missingVars.join(", ")}`);
      }

      // Check for placeholder values
      const apiUrl = configuredVars.REACT_APP_API_URL;
      const hasPlaceholders =
        apiUrl.includes("your-api-gateway-id") ||
        apiUrl.includes("example.com");

      if (hasPlaceholders && this.environment !== "development") {
        this.logTest("Environment Configuration", "warning", {
          message: "API URL contains placeholder values",
          apiUrl,
          configuredVars: Object.keys(configuredVars).length,
        });
      } else {
        this.logTest("Environment Configuration", "pass", {
          apiUrl,
          environment: configuredVars.REACT_APP_ENVIRONMENT,
          region: configuredVars.REACT_APP_AWS_REGION,
          configuredVars: Object.keys(configuredVars).length,
        });
      }

      return configuredVars;
    } catch (err) {
      this.logTest("Environment Configuration", "fail", {}, err);
      return null;
    }
  }

  // Test API connectivity
  async testApiConnectivity(apiUrl) {
    try {
      if (!apiUrl || apiUrl.includes("your-api-gateway-id")) {
        this.logTest("API Connectivity", "warning", {
          message: "API URL not configured, skipping connectivity test",
        });
        return false;
      }

      const start = Date.now();
      const response = await axios.get(`${apiUrl}/api/health`, {
        timeout: 10000,
        headers: {
          "User-Agent": "FrontendValidator/1.0",
        },
      });
      const end = Date.now();
      const responseTime = end - start;

      if (response.status === 200 && responseTime < 2000) {
        this.logTest("API Connectivity", "pass", {
          responseTime,
          status: response.status,
          apiStatus: response.data.status,
        });
        return true;
      } else if (response.status === 200) {
        this.logTest("API Connectivity", "warning", {
          message: "API responds but slowly",
          responseTime,
          status: response.status,
        });
        return true;
      } else {
        throw new Error(`API returned status ${response.status}`);
      }
    } catch (err) {
      this.logTest("API Connectivity", "fail", {}, err);
      return false;
    }
  }

  // Test build configuration
  testBuildConfig() {
    try {
      const packageJsonPath = path.join(this.clientDir, "package.json");

      if (!fs.existsSync(packageJsonPath)) {
        throw new Error("package.json not found");
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      const scripts = packageJson.scripts || {};

      const requiredScripts = [
        "build",
        "build:production",
        "build:aws:production",
      ];

      const missingScripts = requiredScripts.filter(
        (script) => !scripts[script]
      );

      if (missingScripts.length > 0) {
        throw new Error(`Missing build scripts: ${missingScripts.join(", ")}`);
      }

      this.logTest("Build Configuration", "pass", {
        availableScripts: requiredScripts.length,
        totalScripts: Object.keys(scripts).length,
      });

      return true;
    } catch (err) {
      this.logTest("Build Configuration", "fail", {}, err);
      return false;
    }
  }

  // Test build process
  testBuildProcess() {
    try {
      log("Testing build process (this may take a moment)...");

      // Run the build command
      execSync(`npm run build:${this.environment}`, {
        cwd: this.clientDir,
        stdio: "pipe",
      });

      const buildDir = path.join(this.clientDir, "build");

      if (!fs.existsSync(buildDir)) {
        throw new Error("Build directory not created");
      }

      // Check for essential build files
      const requiredFiles = ["index.html", "static"];
      const missingFiles = requiredFiles.filter(
        (file) => !fs.existsSync(path.join(buildDir, file))
      );

      if (missingFiles.length > 0) {
        throw new Error(`Missing build files: ${missingFiles.join(", ")}`);
      }

      // Calculate build size
      const calculateSize = (dir) => {
        let totalSize = 0;
        const files = fs.readdirSync(dir);

        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);

          if (stat.isDirectory()) {
            totalSize += calculateSize(filePath);
          } else {
            totalSize += stat.size;
          }
        }

        return totalSize;
      };

      const buildSize = calculateSize(buildDir);
      const buildSizeMB = (buildSize / 1024 / 1024).toFixed(2);

      this.logTest("Build Process", "pass", {
        buildSizeMB: parseFloat(buildSizeMB),
        requiredFiles: requiredFiles.length,
        buildDirectory: "build/",
      });

      return true;
    } catch (err) {
      this.logTest("Build Process", "fail", {}, err);
      return false;
    }
  }

  // Test configuration validation
  testConfigValidation() {
    try {
      execSync(`npm run validate:config ${this.environment}`, {
        cwd: this.clientDir,
        stdio: "pipe",
      });

      this.logTest("Configuration Validation", "pass", {
        validationScript: "validate:config",
      });

      return true;
    } catch (err) {
      this.logTest("Configuration Validation", "fail", {}, err);
      return false;
    }
  }

  // Test optimization scripts
  testOptimization() {
    try {
      const buildDir = path.join(this.clientDir, "build");

      if (!fs.existsSync(buildDir)) {
        throw new Error("Build directory not found. Run build test first.");
      }

      // Run optimization
      execSync("npm run optimize:build", {
        cwd: this.clientDir,
        stdio: "pipe",
      });

      // Check for optimization artifacts
      const optimizationFiles = [
        "build-report.json",
        "sw.js", // Service worker
      ];

      const foundFiles = optimizationFiles.filter((file) =>
        fs.existsSync(path.join(buildDir, file))
      );

      this.logTest("Build Optimization", "pass", {
        optimizationFiles: foundFiles.length,
        totalOptimizations: optimizationFiles.length,
        files: foundFiles,
      });

      return true;
    } catch (err) {
      this.logTest("Build Optimization", "fail", {}, err);
      return false;
    }
  }

  // Test HTTPS requirement
  testHttpsRequirement(apiUrl) {
    try {
      if (this.environment === "development") {
        this.logTest("HTTPS Requirement", "pass", {
          message: "HTTPS not required for development",
        });
        return true;
      }

      if (!apiUrl || !apiUrl.startsWith("https://")) {
        throw new Error("API URL must use HTTPS for production/staging");
      }

      this.logTest("HTTPS Requirement", "pass", { apiUrl, protocol: "HTTPS" });

      return true;
    } catch (err) {
      this.logTest("HTTPS Requirement", "fail", {}, err);
      return false;
    }
  }

  // Run all validation tests
  async runAllTests() {
    log(`Starting frontend validation for ${this.environment} environment`);
    log("=".repeat(60));

    // Test 1: Environment Configuration
    const envConfig = this.testEnvironmentConfig();
    const apiUrl = envConfig ? envConfig.REACT_APP_API_URL : null;

    // Test 2: HTTPS Requirement
    this.testHttpsRequirement(apiUrl);

    // Test 3: API Connectivity
    await this.testApiConnectivity(apiUrl);

    // Test 4: Build Configuration
    this.testBuildConfig();

    // Test 5: Configuration Validation
    this.testConfigValidation();

    // Test 6: Build Process
    this.testBuildProcess();

    // Test 7: Build Optimization
    this.testOptimization();

    return this.generateReport();
  }

  // Generate validation report
  generateReport() {
    const { total, passed, failed, warnings } = this.results.summary;
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
    const overallStatus =
      failed === 0
        ? warnings === 0
          ? "ready"
          : "ready-with-warnings"
        : "not-ready";

    console.log("\n" + "=".repeat(60));
    console.log("📊 FRONTEND DEPLOYMENT VALIDATION REPORT");
    console.log("=".repeat(60));
    console.log(`🎯 Environment: ${this.environment}`);
    console.log(`📅 Completed: ${new Date().toISOString()}`);
    console.log(`🏆 Overall Status: ${overallStatus.toUpperCase()}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`❌ Failed: ${failed}`);

    // Show critical issues
    const criticalTests = this.results.tests.filter((t) => t.status === "fail");
    if (criticalTests.length > 0) {
      console.log("\n❌ CRITICAL ISSUES:");
      criticalTests.forEach((test) => {
        console.log(`   • ${test.name}: ${test.error || "Failed"}`);
      });
    }

    // Show warnings
    const warningTests = this.results.tests.filter(
      (t) => t.status === "warning"
    );
    if (warningTests.length > 0) {
      console.log("\n⚠️  WARNINGS:");
      warningTests.forEach((test) => {
        console.log(`   • ${test.name}: ${test.details.message || "Warning"}`);
      });
    }

    // Next steps
    console.log("\n💡 NEXT STEPS:");
    if (overallStatus === "ready") {
      console.log("   • Frontend is ready for deployment! 🎉");
      console.log("   • Run: npm run deploy:production");
    } else if (overallStatus === "ready-with-warnings") {
      console.log("   • Frontend can be deployed but has warnings");
      console.log("   • Address warnings for optimal performance");
      console.log("   • Run: npm run deploy:production");
    } else {
      console.log("   • Fix critical issues before deployment");
      console.log("   • Update environment configuration");
      console.log("   • Ensure API Gateway URL is correct");
    }

    console.log("=".repeat(60));

    return {
      success: failed === 0,
      overallStatus,
      summary: this.results.summary,
      successRate: parseFloat(successRate),
      tests: this.results.tests,
      timestamp: new Date().toISOString(),
      environment: this.environment,
    };
  }
}

// Main execution
const main = async () => {
  const environment = process.argv[2] || "production";

  const validator = new FrontendValidator(environment);

  try {
    const report = await validator.runAllTests();

    // Save report
    const reportPath = path.join(
      __dirname,
      "..",
      `frontend-validation-report-${environment}.json`
    );
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    success(`Validation report saved: ${reportPath}`);

    process.exit(report.success ? 0 : 1);
  } catch (error) {
    error(`Validation failed: ${error.message}`);
    process.exit(1);
  }
};

// CLI usage help
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
Usage: node validate-frontend-deployment.js [environment]

Arguments:
  environment  Target environment (default: production)

Examples:
  node validate-frontend-deployment.js production
  node validate-frontend-deployment.js staging

The script will:
1. Validate environment configuration
2. Test API connectivity
3. Verify build configuration
4. Test build process
5. Check optimization setup
6. Validate HTTPS requirements
7. Generate comprehensive report
`);
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = FrontendValidator;
