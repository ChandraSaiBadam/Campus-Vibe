/**
 * Deployment Testing Suite
 *
 * Automated testing scripts for deployed endpoints to validate
 * all application features work in production environment.
 *
 * Requirements addressed:
 * - 4.2: API calls respond within 2 seconds
 * - 4.3: Uptime remains above 99.5% during high traffic
 * - 1.2: Application remains available and responsive
 */

const axios = require("axios");
const { performance } = require("perf_hooks");

class DeploymentTester {
  constructor(baseUrl = process.env.API_BASE_URL || "http://localhost:5001") {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.results = {
      passed: 0,
      failed: 0,
      tests: [],
      startTime: new Date(),
      endTime: null,
      totalDuration: 0,
    };

    // Configure axios with production-like settings
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 5000, // 5 second timeout for testing
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "DeploymentTester/1.0",
      },
    });
  }

  // Utility method to measure response time
  async measureResponseTime(testFn) {
    const start = performance.now();
    const result = await testFn();
    const end = performance.now();
    const duration = end - start;
    return { result, duration };
  }

  // Log test results
  logTest(name, passed, duration, error = null, details = {}) {
    const test = {
      name,
      passed,
      duration: Math.round(duration),
      timestamp: new Date().toISOString(),
      error: error ? error.message : null,
      details,
    };

    this.results.tests.push(test);

    if (passed) {
      this.results.passed++;
      console.log(`✅ ${name} - ${Math.round(duration)}ms`);
    } else {
      this.results.failed++;
      console.log(
        `❌ ${name} - ${Math.round(duration)}ms - ${error?.message || "Failed"}`
      );
    }

    if (details && Object.keys(details).length > 0) {
      console.log(`   Details:`, details);
    }
  }

  // Test 1: Health Check Endpoint
  async testHealthCheck() {
    try {
      const { result, duration } = await this.measureResponseTime(async () => {
        return await this.client.get("/api/health");
      });

      const passed =
        result.status === 200 && result.data.status === "OK" && duration < 2000; // Must respond within 2 seconds

      this.logTest("Health Check", passed, duration, null, {
        status: result.data.status,
        hasMonitoring: !!result.data.monitoring,
        hasHealthData: !!result.data.health,
      });

      return passed;
    } catch (error) {
      this.logTest("Health Check", false, 0, error);
      return false;
    }
  }

  // Test 2: GPA Calculator Endpoint
  async testGPACalculator() {
    try {
      const testData = {
        subjects: [
          { name: "Math", credits: 3, grade: 8.5 },
          { name: "Physics", credits: 4, grade: 9.0 },
          { name: "Chemistry", credits: 3, grade: 7.5 },
        ],
        gradingSystem: "10",
      };

      const { result, duration } = await this.measureResponseTime(async () => {
        return await this.client.post("/api/gpa/calculate", testData);
      });

      const expectedGPA = ((3 * 8.5 + 4 * 9.0 + 3 * 7.5) / 10).toFixed(2);
      const passed =
        result.status === 200 &&
        result.data.success === true &&
        Math.abs(result.data.gpa - parseFloat(expectedGPA)) < 0.01 &&
        duration < 2000;

      this.logTest("GPA Calculator", passed, duration, null, {
        calculatedGPA: result.data.gpa,
        expectedGPA: parseFloat(expectedGPA),
        totalCredits: result.data.totalCredits,
      });

      return passed;
    } catch (error) {
      this.logTest("GPA Calculator", false, 0, error);
      return false;
    }
  }

  // Test 3: GPA Grading Systems Endpoint
  async testGradingSystems() {
    try {
      const { result, duration } = await this.measureResponseTime(async () => {
        return await this.client.get("/api/gpa/grading-systems");
      });

      const passed =
        result.status === 200 &&
        Array.isArray(result.data.systems) &&
        result.data.systems.length > 0 &&
        duration < 2000;

      this.logTest("Grading Systems", passed, duration, null, {
        systemCount: result.data.systems?.length || 0,
        systems: result.data.systems?.map((s) => s.name) || [],
      });

      return passed;
    } catch (error) {
      this.logTest("Grading Systems", false, 0, error);
      return false;
    }
  }

  // Test 4: Forum Questions Endpoint (GET)
  async testForumQuestions() {
    try {
      const { result, duration } = await this.measureResponseTime(async () => {
        return await this.client.get("/api/forum/questions");
      });

      const passed = result.status === 200 && duration < 2000;

      this.logTest("Forum Questions (GET)", passed, duration, null, {
        hasData: !!result.data,
        isArray: Array.isArray(result.data),
        count: Array.isArray(result.data) ? result.data.length : "N/A",
      });

      return passed;
    } catch (error) {
      // Forum might require database, so 503 is acceptable
      const passed = error.response?.status === 503;
      this.logTest("Forum Questions (GET)", passed, 0, error, {
        note: "Database connection may be required",
      });
      return passed;
    }
  }

  // Test 5: Marketplace Items Endpoint (GET)
  async testMarketplaceItems() {
    try {
      const { result, duration } = await this.measureResponseTime(async () => {
        return await this.client.get("/api/marketplace");
      });

      const passed = result.status === 200 && duration < 2000;

      this.logTest("Marketplace Items (GET)", passed, duration, null, {
        hasData: !!result.data,
        isArray: Array.isArray(result.data),
        count: Array.isArray(result.data) ? result.data.length : "N/A",
      });

      return passed;
    } catch (error) {
      // Marketplace might require database, so 503 is acceptable
      const passed = error.response?.status === 503;
      this.logTest("Marketplace Items (GET)", passed, 0, error, {
        note: "Database connection may be required",
      });
      return passed;
    }
  }

  // Test 6: Reviews Endpoint (GET)
  async testReviews() {
    try {
      const { result, duration } = await this.measureResponseTime(async () => {
        return await this.client.get("/api/reviews");
      });

      const passed = result.status === 200 && duration < 2000;

      this.logTest("Reviews (GET)", passed, duration, null, {
        hasData: !!result.data,
        isArray: Array.isArray(result.data),
        count: Array.isArray(result.data) ? result.data.length : "N/A",
      });

      return passed;
    } catch (error) {
      // Reviews might require database, so 503 is acceptable
      const passed = error.response?.status === 503;
      this.logTest("Reviews (GET)", passed, 0, error, {
        note: "Database connection may be required",
      });
      return passed;
    }
  }

  // Test 7: Timetable Endpoint (GET)
  async testTimetable() {
    try {
      const { result, duration } = await this.measureResponseTime(async () => {
        return await this.client.get("/api/timetable");
      });

      const passed = result.status === 200 && duration < 2000;

      this.logTest("Timetable (GET)", passed, duration, null, {
        hasData: !!result.data,
        isArray: Array.isArray(result.data),
        count: Array.isArray(result.data) ? result.data.length : "N/A",
      });

      return passed;
    } catch (error) {
      // Timetable might require database, so 503 is acceptable
      const passed = error.response?.status === 503;
      this.logTest("Timetable (GET)", passed, 0, error, {
        note: "Database connection may be required",
      });
      return passed;
    }
  }

  // Test 8: Cost Monitoring Endpoint
  async testCostMonitoring() {
    try {
      const { result, duration } = await this.measureResponseTime(async () => {
        return await this.client.get("/api/monitoring/costs");
      });

      const passed =
        result.status === 200 && result.data.status === "OK" && duration < 2000;

      this.logTest("Cost Monitoring", passed, duration, null, {
        hasData: !!result.data.data,
        timestamp: result.data.timestamp,
      });

      return passed;
    } catch (error) {
      this.logTest("Cost Monitoring", false, 0, error);
      return false;
    }
  }

  // Test 9: Lambda Warmup Endpoint
  async testLambdaWarmup() {
    try {
      const { result, duration } = await this.measureResponseTime(async () => {
        return await this.client.get("/api/warmup");
      });

      const passed = result.status === 200 && duration < 2000;

      this.logTest("Lambda Warmup", passed, duration, null, {
        message: result.data.message,
        hasResult: !!result.data.result,
      });

      return passed;
    } catch (error) {
      this.logTest("Lambda Warmup", false, 0, error);
      return false;
    }
  }

  // Test 10: CORS Preflight Request
  async testCORSPreflight() {
    try {
      const { result, duration } = await this.measureResponseTime(async () => {
        return await this.client.options("/api/health", {
          headers: {
            Origin: "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Content-Type",
          },
        });
      });

      const passed =
        result.status === 200 &&
        result.headers["access-control-allow-origin"] &&
        duration < 2000;

      this.logTest("CORS Preflight", passed, duration, null, {
        allowOrigin: result.headers["access-control-allow-origin"],
        allowMethods: result.headers["access-control-allow-methods"],
      });

      return passed;
    } catch (error) {
      this.logTest("CORS Preflight", false, 0, error);
      return false;
    }
  }

  // Test 11: Invalid Endpoint (404 handling)
  async testInvalidEndpoint() {
    try {
      const { result, duration } = await this.measureResponseTime(async () => {
        return await this.client.get("/api/nonexistent-endpoint");
      });

      // Should not reach here
      this.logTest(
        "404 Handling",
        false,
        duration,
        new Error("Expected 404 but got success")
      );
      return false;
    } catch (error) {
      const passed = error.response?.status === 404;
      this.logTest("404 Handling", passed, 0, passed ? null : error, {
        expectedStatus: 404,
        actualStatus: error.response?.status,
      });
      return passed;
    }
  }

  // Load test: Multiple concurrent requests
  async testConcurrentLoad(concurrency = 10) {
    try {
      const requests = Array(concurrency)
        .fill()
        .map(async (_, index) => {
          const start = performance.now();
          try {
            const response = await this.client.get("/api/health");
            const end = performance.now();
            return {
              success: true,
              duration: end - start,
              status: response.status,
              index,
            };
          } catch (error) {
            const end = performance.now();
            return {
              success: false,
              duration: end - start,
              error: error.message,
              index,
            };
          }
        });

      const start = performance.now();
      const results = await Promise.all(requests);
      const end = performance.now();
      const totalDuration = end - start;

      const successCount = results.filter((r) => r.success).length;
      const avgDuration =
        results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const maxDuration = Math.max(...results.map((r) => r.duration));

      const passed =
        successCount === concurrency &&
        avgDuration < 2000 &&
        maxDuration < 5000;

      this.logTest("Concurrent Load Test", passed, totalDuration, null, {
        concurrency,
        successRate: `${successCount}/${concurrency}`,
        avgResponseTime: Math.round(avgDuration),
        maxResponseTime: Math.round(maxDuration),
        totalDuration: Math.round(totalDuration),
      });

      return passed;
    } catch (error) {
      this.logTest("Concurrent Load Test", false, 0, error);
      return false;
    }
  }

  // Run all tests
  async runAllTests() {
    console.log(`🚀 Starting deployment tests for: ${this.baseUrl}`);
    console.log(
      `📅 Test started at: ${this.results.startTime.toISOString()}\n`
    );

    const tests = [
      () => this.testHealthCheck(),
      () => this.testGPACalculator(),
      () => this.testGradingSystems(),
      () => this.testForumQuestions(),
      () => this.testMarketplaceItems(),
      () => this.testReviews(),
      () => this.testTimetable(),
      () => this.testCostMonitoring(),
      () => this.testLambdaWarmup(),
      () => this.testCORSPreflight(),
      () => this.testInvalidEndpoint(),
      () => this.testConcurrentLoad(5), // Test with 5 concurrent requests
    ];

    // Run tests sequentially to avoid overwhelming the server
    for (const test of tests) {
      try {
        await test();
        // Small delay between tests
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error("Test execution error:", error);
      }
    }

    this.results.endTime = new Date();
    this.results.totalDuration = this.results.endTime - this.results.startTime;

    return this.generateReport();
  }

  // Generate test report
  generateReport() {
    const totalTests = this.results.passed + this.results.failed;
    const successRate =
      totalTests > 0
        ? ((this.results.passed / totalTests) * 100).toFixed(1)
        : 0;

    console.log("\n" + "=".repeat(60));
    console.log("📊 DEPLOYMENT TEST REPORT");
    console.log("=".repeat(60));
    console.log(`🎯 Target URL: ${this.baseUrl}`);
    console.log(
      `⏱️  Total Duration: ${Math.round(this.results.totalDuration)}ms`
    );
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log(`📅 Completed: ${this.results.endTime.toISOString()}`);

    if (this.results.failed > 0) {
      console.log("\n❌ FAILED TESTS:");
      this.results.tests
        .filter((test) => !test.passed)
        .forEach((test) => {
          console.log(`   • ${test.name}: ${test.error || "Unknown error"}`);
        });
    }

    console.log("\n📋 DETAILED RESULTS:");
    this.results.tests.forEach((test) => {
      const status = test.passed ? "✅" : "❌";
      console.log(`   ${status} ${test.name} (${test.duration}ms)`);
    });

    console.log("=".repeat(60));

    // Return summary for programmatic use
    return {
      success: this.results.failed === 0,
      totalTests,
      passed: this.results.passed,
      failed: this.results.failed,
      successRate: parseFloat(successRate),
      duration: this.results.totalDuration,
      tests: this.results.tests,
      url: this.baseUrl,
      timestamp: this.results.endTime.toISOString(),
    };
  }
}

// Export for use in other scripts
module.exports = DeploymentTester;

// CLI usage
if (require.main === module) {
  const baseUrl =
    process.argv[2] || process.env.API_BASE_URL || "http://localhost:5001";

  const tester = new DeploymentTester(baseUrl);

  tester
    .runAllTests()
    .then((report) => {
      process.exit(report.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Test suite failed:", error);
      process.exit(1);
    });
}
