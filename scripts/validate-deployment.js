#!/usr/bin/env node

/**
 * Comprehensive Deployment Validation Script
 *
 * Validates that the entire application stack works correctly in production
 *
 * Requirements addressed:
 * - 4.2: API calls respond within 2 seconds
 * - 4.3: Uptime remains above 99.5% during high traffic
 * - 1.2: Application remains available and responsive
 */

const DeploymentTester = require("../server/tests/deployment-tests");
const axios = require("axios");
const { performance } = require("perf_hooks");

class ComprehensiveValidator {
  constructor(options = {}) {
    this.backendUrl =
      options.backendUrl || process.env.API_BASE_URL || "http://localhost:5001";
    this.frontendUrl =
      options.frontendUrl ||
      process.env.FRONTEND_URL ||
      "http://localhost:3000";
    this.results = {
      backend: null,
      frontend: null,
      integration: null,
      overall: null,
    };
  }

  // Validate backend deployment
  async validateBackend() {
    console.log("🔧 Validating Backend Deployment...");
    console.log(`📍 Backend URL: ${this.backendUrl}\n`);

    const tester = new DeploymentTester(this.backendUrl);
    this.results.backend = await tester.runAllTests();

    return this.results.backend;
  }

  // Validate frontend deployment
  async validateFrontend() {
    console.log("\n🎨 Validating Frontend Deployment...");
    console.log(`📍 Frontend URL: ${this.frontendUrl}\n`);

    try {
      // Test frontend accessibility
      const start = performance.now();
      const response = await axios.get(this.frontendUrl, {
        timeout: 10000,
        headers: {
          "User-Agent": "DeploymentValidator/1.0",
        },
      });
      const end = performance.now();
      const loadTime = end - start;

      const frontendTests = {
        accessible: response.status === 200,
        loadTime: Math.round(loadTime),
        loadTimeAcceptable: loadTime < 3000, // Must load within 3 seconds
        hasContent: response.data && response.data.length > 0,
        isHTML: response.headers["content-type"]?.includes("text/html"),
        hasTitle: response.data?.includes("<title>"),
        hasReactRoot:
          response.data?.includes('id="root"') ||
          response.data?.includes('id="app"'),
      };

      const passed = Object.values(frontendTests).filter(Boolean).length;
      const total = Object.keys(frontendTests).length;
      const successRate = (passed / total) * 100;

      console.log(`✅ Frontend Accessible: ${frontendTests.accessible}`);
      console.log(
        `⏱️  Load Time: ${frontendTests.loadTime}ms (${
          frontendTests.loadTimeAcceptable ? "PASS" : "FAIL"
        })`
      );
      console.log(`📄 Has Content: ${frontendTests.hasContent}`);
      console.log(`🌐 Is HTML: ${frontendTests.isHTML}`);
      console.log(`📝 Has Title: ${frontendTests.hasTitle}`);
      console.log(`⚛️  Has React Root: ${frontendTests.hasReactRoot}`);
      console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`);

      this.results.frontend = {
        success: successRate >= 80,
        tests: frontendTests,
        successRate,
        loadTime: frontendTests.loadTime,
        url: this.frontendUrl,
      };

      return this.results.frontend;
    } catch (error) {
      console.log(`❌ Frontend validation failed: ${error.message}`);

      this.results.frontend = {
        success: false,
        error: error.message,
        url: this.frontendUrl,
      };

      return this.results.frontend;
    }
  }

  // Validate integration between frontend and backend
  async validateIntegration() {
    console.log("\n🔗 Validating Frontend-Backend Integration...\n");

    try {
      const integrationTests = [];

      // Test 1: CORS Configuration
      try {
        const corsResponse = await axios.options(
          `${this.backendUrl}/api/health`,
          {
            headers: {
              Origin: this.frontendUrl,
              "Access-Control-Request-Method": "GET",
              "Access-Control-Request-Headers": "Content-Type",
            },
            timeout: 5000,
          }
        );

        const corsWorking =
          corsResponse.status === 200 &&
          corsResponse.headers["access-control-allow-origin"];

        integrationTests.push({
          name: "CORS Configuration",
          passed: corsWorking,
          details: {
            allowOrigin: corsResponse.headers["access-control-allow-origin"],
            allowMethods: corsResponse.headers["access-control-allow-methods"],
          },
        });

        console.log(`${corsWorking ? "✅" : "❌"} CORS Configuration`);
      } catch (error) {
        integrationTests.push({
          name: "CORS Configuration",
          passed: false,
          error: error.message,
        });
        console.log(`❌ CORS Configuration - ${error.message}`);
      }

      // Test 2: API Endpoint Accessibility from Frontend Domain
      try {
        const apiResponse = await axios.get(`${this.backendUrl}/api/health`, {
          headers: {
            Origin: this.frontendUrl,
            Referer: this.frontendUrl,
          },
          timeout: 5000,
        });

        const apiAccessible = apiResponse.status === 200;

        integrationTests.push({
          name: "API Accessibility",
          passed: apiAccessible,
          details: {
            status: apiResponse.status,
            responseTime: apiResponse.headers["x-response-time"] || "N/A",
          },
        });

        console.log(`${apiAccessible ? "✅" : "❌"} API Accessibility`);
      } catch (error) {
        integrationTests.push({
          name: "API Accessibility",
          passed: false,
          error: error.message,
        });
        console.log(`❌ API Accessibility - ${error.message}`);
      }

      // Test 3: Environment Variable Consistency
      try {
        const healthResponse = await axios.get(`${this.backendUrl}/api/health`);
        const backendEnv = healthResponse.data.environment;

        // Check if frontend URL is configured in backend
        const frontendConfigured =
          healthResponse.data.monitoring?.frontendUrl === this.frontendUrl ||
          process.env.FRONTEND_URL === this.frontendUrl;

        integrationTests.push({
          name: "Environment Consistency",
          passed: !!backendEnv,
          details: {
            backendEnvironment: backendEnv,
            frontendConfigured,
          },
        });

        console.log(`${backendEnv ? "✅" : "❌"} Environment Consistency`);
      } catch (error) {
        integrationTests.push({
          name: "Environment Consistency",
          passed: false,
          error: error.message,
        });
        console.log(`❌ Environment Consistency - ${error.message}`);
      }

      const passedTests = integrationTests.filter((test) => test.passed).length;
      const totalTests = integrationTests.length;
      const successRate = (passedTests / totalTests) * 100;

      console.log(`📈 Integration Success Rate: ${successRate.toFixed(1)}%`);

      this.results.integration = {
        success: successRate >= 80,
        tests: integrationTests,
        successRate,
        passed: passedTests,
        total: totalTests,
      };

      return this.results.integration;
    } catch (error) {
      console.log(`❌ Integration validation failed: ${error.message}`);

      this.results.integration = {
        success: false,
        error: error.message,
      };

      return this.results.integration;
    }
  }

  // Generate overall deployment report
  generateOverallReport() {
    const components = ["backend", "frontend", "integration"];
    const componentResults = components.map((component) => ({
      name: component,
      success: this.results[component]?.success || false,
      successRate: this.results[component]?.successRate || 0,
    }));

    const overallSuccess = componentResults.every((comp) => comp.success);
    const avgSuccessRate =
      componentResults.reduce((sum, comp) => sum + comp.successRate, 0) /
      components.length;

    console.log("\n" + "=".repeat(80));
    console.log("📊 COMPREHENSIVE DEPLOYMENT VALIDATION REPORT");
    console.log("=".repeat(80));
    console.log(`🎯 Backend URL: ${this.backendUrl}`);
    console.log(`🎯 Frontend URL: ${this.frontendUrl}`);
    console.log(`📅 Validation Time: ${new Date().toISOString()}`);
    console.log("");

    // Component Summary
    componentResults.forEach((comp) => {
      const status = comp.success ? "✅ PASS" : "❌ FAIL";
      console.log(
        `${status} ${comp.name.toUpperCase()}: ${comp.successRate.toFixed(1)}%`
      );
    });

    console.log("");
    console.log(`🏆 OVERALL STATUS: ${overallSuccess ? "✅ PASS" : "❌ FAIL"}`);
    console.log(`📈 AVERAGE SUCCESS RATE: ${avgSuccessRate.toFixed(1)}%`);

    // Detailed Results
    if (this.results.backend) {
      console.log(
        `\n🔧 Backend: ${this.results.backend.passed}/${this.results.backend.totalTests} tests passed`
      );
    }

    if (this.results.frontend) {
      console.log(
        `🎨 Frontend: ${
          this.results.frontend.success ? "Accessible" : "Failed"
        }`
      );
      if (this.results.frontend.loadTime) {
        console.log(`   Load Time: ${this.results.frontend.loadTime}ms`);
      }
    }

    if (this.results.integration) {
      console.log(
        `🔗 Integration: ${this.results.integration.passed}/${this.results.integration.total} tests passed`
      );
    }

    // Recommendations
    console.log("\n💡 RECOMMENDATIONS:");
    if (!overallSuccess) {
      if (!this.results.backend?.success) {
        console.log("   • Check backend deployment and database connectivity");
      }
      if (!this.results.frontend?.success) {
        console.log("   • Verify frontend build and deployment configuration");
      }
      if (!this.results.integration?.success) {
        console.log("   • Review CORS settings and environment variables");
      }
    } else {
      console.log("   • All systems operational! 🎉");
    }

    console.log("=".repeat(80));

    this.results.overall = {
      success: overallSuccess,
      avgSuccessRate,
      components: componentResults,
      timestamp: new Date().toISOString(),
      urls: {
        backend: this.backendUrl,
        frontend: this.frontendUrl,
      },
    };

    return this.results.overall;
  }

  // Run complete validation
  async runCompleteValidation() {
    console.log("🚀 Starting Comprehensive Deployment Validation\n");

    try {
      // Run all validations
      await this.validateBackend();
      await this.validateFrontend();
      await this.validateIntegration();

      // Generate overall report
      const overallResult = this.generateOverallReport();

      return overallResult;
    } catch (error) {
      console.error("❌ Validation failed:", error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const backendUrl =
    args[0] || process.env.API_BASE_URL || "http://localhost:5001";
  const frontendUrl =
    args[1] || process.env.FRONTEND_URL || "http://localhost:3000";

  const validator = new ComprehensiveValidator({ backendUrl, frontendUrl });

  validator
    .runCompleteValidation()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Validation suite failed:", error);
      process.exit(1);
    });
}

module.exports = ComprehensiveValidator;
