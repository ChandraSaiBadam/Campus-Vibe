#!/usr/bin/env node

/**
 * Performance Testing Script for Campus Vibe Deployment
 *
 * Tests the optimizations implemented in task 10:
 * - Lambda memory and timeout settings
 * - API Gateway caching and rate limiting
 * - Frontend build optimizations
 *
 * Requirements validated:
 * - 1.1: Minimize costs while maintaining performance
 * - 4.1: Frontend loads within 3 seconds globally
 * - 4.2: API calls respond within 2 seconds
 */

const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Configuration
const CONFIG = {
  API_BASE_URL:
    process.env.API_URL || "https://your-api-gateway-url.amazonaws.com/prod",
  FRONTEND_URL:
    process.env.FRONTEND_URL || "https://your-cloudfront-url.cloudfront.net",
  TEST_DURATION: 30000, // 30 seconds
  CONCURRENT_USERS: 50,
  PERFORMANCE_THRESHOLDS: {
    API_RESPONSE_TIME: 2000, // 2 seconds
    FRONTEND_LOAD_TIME: 3000, // 3 seconds
    ERROR_RATE: 5, // 5%
    CACHE_HIT_RATE: 70, // 70%
  },
};

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  api: {
    tests: [],
    averageResponseTime: 0,
    errorRate: 0,
    cacheHitRate: 0,
  },
  frontend: {
    loadTime: 0,
    resourceCount: 0,
    totalSize: 0,
  },
  performance: {
    passed: false,
    issues: [],
    recommendations: [],
  },
};

// Helper functions
const log = (message) => console.log(`[PERF-TEST] ${message}`);
const error = (message) => console.error(`[ERROR] ${message}`);

/**
 * Test API endpoint performance
 */
const testAPIEndpoint = async (endpoint, expectedCacheTime = 0) => {
  const startTime = Date.now();

  try {
    const response = await axios.get(`${CONFIG.API_BASE_URL}${endpoint}`, {
      timeout: 5000,
      headers: {
        "User-Agent": "Performance-Test-Bot/1.0",
      },
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    const result = {
      endpoint,
      responseTime,
      statusCode: response.status,
      cached: response.headers["x-cache"] === "Hit",
      contentLength: response.headers["content-length"] || 0,
      success:
        response.status === 200 &&
        responseTime < CONFIG.PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME,
    };

    testResults.api.tests.push(result);

    log(
      `${endpoint}: ${responseTime}ms (${response.status}) ${
        result.cached ? "[CACHED]" : "[FRESH]"
      }`
    );

    return result;
  } catch (err) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    const result = {
      endpoint,
      responseTime,
      statusCode: err.response?.status || 0,
      cached: false,
      contentLength: 0,
      success: false,
      error: err.message,
    };

    testResults.api.tests.push(result);
    error(`${endpoint}: ${err.message} (${responseTime}ms)`);

    return result;
  }
};

/**
 * Test multiple API endpoints
 */
const testAPIPerformance = async () => {
  log("Testing API performance...");

  const endpoints = [
    "/api/health",
    "/api/courses",
    "/api/faculty",
    "/api/reviews",
    "/api/questions",
    "/api/marketplace",
  ];

  // Test each endpoint multiple times to check caching
  for (const endpoint of endpoints) {
    log(`Testing ${endpoint}...`);

    // First request (should be fresh)
    await testAPIEndpoint(endpoint);

    // Wait a moment then test again (should be cached)
    await new Promise((resolve) => setTimeout(resolve, 100));
    await testAPIEndpoint(endpoint);
  }

  // Calculate metrics
  const successfulTests = testResults.api.tests.filter((t) => t.success);
  const cachedTests = testResults.api.tests.filter((t) => t.cached);

  testResults.api.averageResponseTime =
    testResults.api.tests.reduce((sum, t) => sum + t.responseTime, 0) /
    testResults.api.tests.length;
  testResults.api.errorRate =
    ((testResults.api.tests.length - successfulTests.length) /
      testResults.api.tests.length) *
    100;
  testResults.api.cacheHitRate =
    (cachedTests.length / testResults.api.tests.length) * 100;

  log(`API Performance Summary:`);
  log(
    `  Average Response Time: ${testResults.api.averageResponseTime.toFixed(
      2
    )}ms`
  );
  log(`  Error Rate: ${testResults.api.errorRate.toFixed(2)}%`);
  log(`  Cache Hit Rate: ${testResults.api.cacheHitRate.toFixed(2)}%`);
};

/**
 * Test frontend performance
 */
const testFrontendPerformance = async () => {
  log("Testing frontend performance...");

  try {
    const startTime = Date.now();

    const response = await axios.get(CONFIG.FRONTEND_URL, {
      timeout: 10000,
      headers: {
        "User-Agent": "Performance-Test-Bot/1.0",
      },
    });

    const endTime = Date.now();
    const loadTime = endTime - startTime;

    testResults.frontend.loadTime = loadTime;
    testResults.frontend.totalSize = parseInt(
      response.headers["content-length"] || "0"
    );

    // Parse HTML to count resources
    const html = response.data;
    const cssMatches = html.match(/<link[^>]*\.css[^>]*>/g) || [];
    const jsMatches = html.match(/<script[^>]*\.js[^>]*>/g) || [];
    const imgMatches = html.match(/<img[^>]*>/g) || [];

    testResults.frontend.resourceCount =
      cssMatches.length + jsMatches.length + imgMatches.length;

    log(`Frontend Performance:`);
    log(`  Load Time: ${loadTime}ms`);
    log(`  Resource Count: ${testResults.frontend.resourceCount}`);
    log(
      `  Total Size: ${(testResults.frontend.totalSize / 1024).toFixed(2)}KB`
    );
  } catch (err) {
    error(`Frontend test failed: ${err.message}`);
    testResults.frontend.loadTime = 10000; // Mark as failed
  }
};

/**
 * Test concurrent load
 */
const testConcurrentLoad = async () => {
  log(`Testing concurrent load with ${CONFIG.CONCURRENT_USERS} users...`);

  const promises = [];
  const startTime = Date.now();

  for (let i = 0; i < CONFIG.CONCURRENT_USERS; i++) {
    promises.push(testAPIEndpoint("/api/health"));
  }

  const results = await Promise.allSettled(promises);
  const endTime = Date.now();

  const successful = results.filter(
    (r) => r.status === "fulfilled" && r.value.success
  ).length;
  const failed = results.length - successful;

  log(`Concurrent Load Test Results:`);
  log(`  Duration: ${endTime - startTime}ms`);
  log(`  Successful: ${successful}/${CONFIG.CONCURRENT_USERS}`);
  log(`  Failed: ${failed}/${CONFIG.CONCURRENT_USERS}`);
  log(
    `  Success Rate: ${((successful / CONFIG.CONCURRENT_USERS) * 100).toFixed(
      2
    )}%`
  );
};

/**
 * Evaluate overall performance
 */
const evaluatePerformance = () => {
  log("Evaluating performance against thresholds...");

  const issues = [];
  const recommendations = [];

  // Check API response time
  if (
    testResults.api.averageResponseTime >
    CONFIG.PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME
  ) {
    issues.push(
      `API response time (${testResults.api.averageResponseTime.toFixed(
        2
      )}ms) exceeds threshold (${
        CONFIG.PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME
      }ms)`
    );
    recommendations.push(
      "Consider increasing Lambda memory or optimizing database queries"
    );
  }

  // Check frontend load time
  if (
    testResults.frontend.loadTime >
    CONFIG.PERFORMANCE_THRESHOLDS.FRONTEND_LOAD_TIME
  ) {
    issues.push(
      `Frontend load time (${testResults.frontend.loadTime}ms) exceeds threshold (${CONFIG.PERFORMANCE_THRESHOLDS.FRONTEND_LOAD_TIME}ms)`
    );
    recommendations.push("Optimize frontend bundle size or enable CDN caching");
  }

  // Check error rate
  if (testResults.api.errorRate > CONFIG.PERFORMANCE_THRESHOLDS.ERROR_RATE) {
    issues.push(
      `API error rate (${testResults.api.errorRate.toFixed(
        2
      )}%) exceeds threshold (${CONFIG.PERFORMANCE_THRESHOLDS.ERROR_RATE}%)`
    );
    recommendations.push("Investigate and fix API errors");
  }

  // Check cache hit rate
  if (
    testResults.api.cacheHitRate < CONFIG.PERFORMANCE_THRESHOLDS.CACHE_HIT_RATE
  ) {
    issues.push(
      `Cache hit rate (${testResults.api.cacheHitRate.toFixed(
        2
      )}%) below threshold (${CONFIG.PERFORMANCE_THRESHOLDS.CACHE_HIT_RATE}%)`
    );
    recommendations.push("Review caching configuration and TTL settings");
  }

  testResults.performance.passed = issues.length === 0;
  testResults.performance.issues = issues;
  testResults.performance.recommendations = recommendations;

  if (testResults.performance.passed) {
    log("✅ All performance tests passed!");
  } else {
    log("❌ Performance issues detected:");
    issues.forEach((issue) => log(`  - ${issue}`));

    if (recommendations.length > 0) {
      log("💡 Recommendations:");
      recommendations.forEach((rec) => log(`  - ${rec}`));
    }
  }
};

/**
 * Generate performance report
 */
const generateReport = () => {
  const reportPath = path.join(__dirname, "..", "performance-report.json");

  const report = {
    ...testResults,
    summary: {
      testsPassed: testResults.performance.passed,
      apiPerformance:
        testResults.api.averageResponseTime <
        CONFIG.PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME
          ? "PASS"
          : "FAIL",
      frontendPerformance:
        testResults.frontend.loadTime <
        CONFIG.PERFORMANCE_THRESHOLDS.FRONTEND_LOAD_TIME
          ? "PASS"
          : "FAIL",
      cacheEfficiency:
        testResults.api.cacheHitRate >=
        CONFIG.PERFORMANCE_THRESHOLDS.CACHE_HIT_RATE
          ? "PASS"
          : "FAIL",
      overallGrade: testResults.performance.passed
        ? "A"
        : testResults.performance.issues.length <= 2
        ? "B"
        : "C",
    },
    thresholds: CONFIG.PERFORMANCE_THRESHOLDS,
    testConfig: {
      concurrentUsers: CONFIG.CONCURRENT_USERS,
      testDuration: CONFIG.TEST_DURATION,
      apiBaseUrl: CONFIG.API_BASE_URL,
      frontendUrl: CONFIG.FRONTEND_URL,
    },
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`Performance report saved to: ${reportPath}`);

  return report;
};

/**
 * Main test execution
 */
const main = async () => {
  try {
    log("Starting performance tests...");
    log(`API Base URL: ${CONFIG.API_BASE_URL}`);
    log(`Frontend URL: ${CONFIG.FRONTEND_URL}`);

    await testAPIPerformance();
    await testFrontendPerformance();
    await testConcurrentLoad();

    evaluatePerformance();
    const report = generateReport();

    log("Performance testing completed!");

    // Exit with appropriate code
    process.exit(testResults.performance.passed ? 0 : 1);
  } catch (err) {
    error(`Performance test failed: ${err.message}`);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  testAPIEndpoint,
  testAPIPerformance,
  testFrontendPerformance,
  testConcurrentLoad,
  evaluatePerformance,
  generateReport,
};
