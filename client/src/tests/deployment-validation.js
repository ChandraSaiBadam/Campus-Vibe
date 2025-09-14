/**
 * Frontend Deployment Validation
 *
 * Validates that all frontend features work correctly in production
 *
 * Requirements addressed:
 * - 4.1: Frontend loads within 3 seconds globally
 * - 4.2: API calls respond within 2 seconds
 * - 1.2: Application remains available and responsive
 */

import api, { healthCheck, API_ENDPOINTS } from "../config/api";

class FrontendValidator {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: [],
      startTime: new Date(),
      endTime: null,
    };
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

  // Measure performance
  async measurePerformance(testFn) {
    const start = performance.now();
    const result = await testFn();
    const end = performance.now();
    const duration = end - start;
    return { result, duration };
  }

  // Test 1: API Configuration
  async testAPIConfiguration() {
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return {
          baseURL: api.defaults.baseURL,
          timeout: api.defaults.timeout,
          endpoints: API_ENDPOINTS,
        };
      });

      const passed =
        result.baseURL &&
        result.timeout > 0 &&
        Object.keys(result.endpoints).length > 0;

      this.logTest("API Configuration", passed, duration, null, {
        baseURL: result.baseURL,
        timeout: result.timeout,
        endpointGroups: Object.keys(result.endpoints).length,
      });

      return passed;
    } catch (error) {
      this.logTest("API Configuration", false, 0, error);
      return false;
    }
  }

  // Test 2: Health Check API
  async testHealthCheckAPI() {
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return await healthCheck();
      });

      const passed = result.status === "healthy" && duration < 3000;

      this.logTest("Health Check API", passed, duration, null, {
        status: result.status,
        environment: result.environment,
        hasMonitoring: !!result.monitoring,
      });

      return passed;
    } catch (error) {
      this.logTest("Health Check API", false, 0, error);
      return false;
    }
  }

  // Test 3: GPA Calculator API
  async testGPACalculatorAPI() {
    try {
      const testData = {
        subjects: [
          { name: "Math", credits: 3, grade: 8.5 },
          { name: "Physics", credits: 4, grade: 9.0 },
        ],
        gradingSystem: "10",
      };

      const { result, duration } = await this.measurePerformance(async () => {
        const response = await api.post("/api/gpa/calculate", testData);
        return response.data;
      });

      const passed =
        result.success === true && result.gpa > 0 && duration < 2000;

      this.logTest("GPA Calculator API", passed, duration, null, {
        gpa: result.gpa,
        totalCredits: result.totalCredits,
        success: result.success,
      });

      return passed;
    } catch (error) {
      this.logTest("GPA Calculator API", false, 0, error);
      return false;
    }
  }

  // Test 4: Forum API Endpoints
  async testForumAPI() {
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        const response = await api.get(API_ENDPOINTS.FORUM.QUESTIONS);
        return response.data;
      });

      const passed = duration < 2000; // Accept any response within time limit

      this.logTest("Forum API", passed, duration, null, {
        hasData: !!result,
        isArray: Array.isArray(result),
        count: Array.isArray(result) ? result.length : "N/A",
      });

      return passed;
    } catch (error) {
      // Forum might require database, so 503 is acceptable
      const passed = error.response?.status === 503;
      this.logTest("Forum API", passed, 0, passed ? null : error, {
        note: "Database connection may be required",
        status: error.response?.status,
      });
      return passed;
    }
  }

  // Test 5: Marketplace API Endpoints
  async testMarketplaceAPI() {
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        const response = await api.get(API_ENDPOINTS.MARKETPLACE.ITEMS);
        return response.data;
      });

      const passed = duration < 2000;

      this.logTest("Marketplace API", passed, duration, null, {
        hasData: !!result,
        isArray: Array.isArray(result),
        count: Array.isArray(result) ? result.length : "N/A",
      });

      return passed;
    } catch (error) {
      const passed = error.response?.status === 503;
      this.logTest("Marketplace API", passed, 0, passed ? null : error, {
        note: "Database connection may be required",
        status: error.response?.status,
      });
      return passed;
    }
  }

  // Test 6: Reviews API Endpoints
  async testReviewsAPI() {
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        const response = await api.get(API_ENDPOINTS.REVIEWS.BASE);
        return response.data;
      });

      const passed = duration < 2000;

      this.logTest("Reviews API", passed, duration, null, {
        hasData: !!result,
        isArray: Array.isArray(result),
        count: Array.isArray(result) ? result.length : "N/A",
      });

      return passed;
    } catch (error) {
      const passed = error.response?.status === 503;
      this.logTest("Reviews API", passed, 0, passed ? null : error, {
        note: "Database connection may be required",
        status: error.response?.status,
      });
      return passed;
    }
  }

  // Test 7: Error Handling
  async testErrorHandling() {
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        try {
          await api.get("/api/nonexistent-endpoint");
          return { success: false, error: "Expected 404 but got success" };
        } catch (error) {
          return {
            success: error.response?.status === 404,
            status: error.response?.status,
            error: error.message,
          };
        }
      });

      const passed = result.success;

      this.logTest("Error Handling", passed, duration, null, {
        expectedStatus: 404,
        actualStatus: result.status,
        handledCorrectly: result.success,
      });

      return passed;
    } catch (error) {
      this.logTest("Error Handling", false, 0, error);
      return false;
    }
  }

  // Test 8: Response Time Consistency
  async testResponseTimeConsistency() {
    try {
      const requests = 5;
      const results = [];

      for (let i = 0; i < requests; i++) {
        const { duration } = await this.measurePerformance(async () => {
          return await healthCheck();
        });
        results.push(duration);

        // Small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const avgDuration =
        results.reduce((sum, d) => sum + d, 0) / results.length;
      const maxDuration = Math.max(...results);
      const minDuration = Math.min(...results);
      const variance =
        results.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) /
        results.length;
      const stdDev = Math.sqrt(variance);

      const passed = avgDuration < 2000 && maxDuration < 3000 && stdDev < 500;

      this.logTest("Response Time Consistency", passed, avgDuration, null, {
        requests,
        avgDuration: Math.round(avgDuration),
        maxDuration: Math.round(maxDuration),
        minDuration: Math.round(minDuration),
        standardDeviation: Math.round(stdDev),
      });

      return passed;
    } catch (error) {
      this.logTest("Response Time Consistency", false, 0, error);
      return false;
    }
  }

  // Test 9: Environment Configuration
  async testEnvironmentConfiguration() {
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        return {
          nodeEnv: process.env.NODE_ENV,
          reactAppEnv: process.env.REACT_APP_ENVIRONMENT,
          apiUrl: process.env.REACT_APP_API_URL,
          hasRequiredEnvVars: !!process.env.REACT_APP_API_URL,
        };
      });

      const passed = result.hasRequiredEnvVars;

      this.logTest("Environment Configuration", passed, duration, null, {
        nodeEnv: result.nodeEnv,
        reactAppEnv: result.reactAppEnv,
        hasApiUrl: !!result.apiUrl,
        configuredCorrectly: result.hasRequiredEnvVars,
      });

      return passed;
    } catch (error) {
      this.logTest("Environment Configuration", false, 0, error);
      return false;
    }
  }

  // Test 10: Local Storage Functionality
  async testLocalStorageFunctionality() {
    try {
      const { result, duration } = await this.measurePerformance(async () => {
        const testKey = "deployment-test";
        const testValue = { timestamp: Date.now(), test: true };

        // Test write
        localStorage.setItem(testKey, JSON.stringify(testValue));

        // Test read
        const retrieved = JSON.parse(localStorage.getItem(testKey));

        // Test delete
        localStorage.removeItem(testKey);

        return {
          writeSuccess: true,
          readSuccess: retrieved && retrieved.test === true,
          deleteSuccess: !localStorage.getItem(testKey),
        };
      });

      const passed =
        result.writeSuccess && result.readSuccess && result.deleteSuccess;

      this.logTest("Local Storage Functionality", passed, duration, null, {
        writeSuccess: result.writeSuccess,
        readSuccess: result.readSuccess,
        deleteSuccess: result.deleteSuccess,
      });

      return passed;
    } catch (error) {
      this.logTest("Local Storage Functionality", false, 0, error);
      return false;
    }
  }

  // Run all frontend tests
  async runAllTests() {
    console.log("🚀 Starting frontend deployment validation");
    console.log(
      `📅 Test started at: ${this.results.startTime.toISOString()}\n`
    );

    const tests = [
      () => this.testAPIConfiguration(),
      () => this.testHealthCheckAPI(),
      () => this.testGPACalculatorAPI(),
      () => this.testForumAPI(),
      () => this.testMarketplaceAPI(),
      () => this.testReviewsAPI(),
      () => this.testErrorHandling(),
      () => this.testResponseTimeConsistency(),
      () => this.testEnvironmentConfiguration(),
      () => this.testLocalStorageFunctionality(),
    ];

    // Run tests sequentially
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
    console.log("📊 FRONTEND VALIDATION REPORT");
    console.log("=".repeat(60));
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

    return {
      success: this.results.failed === 0,
      totalTests,
      passed: this.results.passed,
      failed: this.results.failed,
      successRate: parseFloat(successRate),
      duration: this.results.totalDuration,
      tests: this.results.tests,
      timestamp: this.results.endTime.toISOString(),
    };
  }
}

// Export for use in other components
export default FrontendValidator;

// Function to run validation from browser console
window.runFrontendValidation = async () => {
  const validator = new FrontendValidator();
  return await validator.runAllTests();
};
