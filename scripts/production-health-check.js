#!/usr/bin/env node

/**
 * Production Health Check Script
 *
 * Comprehensive health validation for production deployment
 * with enhanced monitoring and alerting capabilities.
 *
 * Requirements addressed:
 * - 4.2: API calls respond within 2 seconds
 * - 4.3: Uptime remains above 99.5% during high traffic
 * - 1.2: Application remains available and responsive
 * - 3.1: Basic metrics collected automatically
 * - 3.2: Errors logged and accessible for review
 */

const axios = require("axios");
const { performance } = require("perf_hooks");

class ProductionHealthChecker {
  constructor(baseUrl = process.env.API_BASE_URL || "http://localhost:5001") {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "ProductionHealthChecker/1.0",
      },
    });

    this.results = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
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
  logTest(name, status, duration, details = {}, alerts = []) {
    const test = {
      name,
      status, // 'pass', 'fail', 'warning'
      duration: Math.round(duration),
      timestamp: new Date().toISOString(),
      details,
      alerts,
    };

    this.results.tests.push(test);
    this.results.summary.total++;

    switch (status) {
      case "pass":
        this.results.summary.passed++;
        console.log(`✅ ${name} - ${Math.round(duration)}ms`);
        break;
      case "fail":
        this.results.summary.failed++;
        console.log(`❌ ${name} - ${Math.round(duration)}ms`);
        break;
      case "warning":
        this.results.summary.warnings++;
        console.log(`⚠️  ${name} - ${Math.round(duration)}ms`);
        break;
    }

    if (Object.keys(details).length > 0) {
      console.log(`   Details:`, details);
    }

    if (alerts.length > 0) {
      console.log(
        `   Alerts:`,
        alerts.map((a) => `${a.level}: ${a.message}`).join(", ")
      );
    }
  }

  // Test basic health endpoint
  async testBasicHealth() {
    const start = performance.now();

    try {
      const response = await this.client.get("/api/health");
      const end = performance.now();
      const duration = end - start;

      const isHealthy =
        response.status === 200 &&
        response.data.status === "OK" &&
        duration < 2000;

      this.logTest(
        "Basic Health Check",
        isHealthy ? "pass" : "warning",
        duration,
        {
          status: response.data.status,
          hasMonitoring: !!response.data.monitoring,
          environment: response.data.health?.environment || "unknown",
        }
      );

      return isHealthy;
    } catch (error) {
      const end = performance.now();
      const duration = end - start;

      this.logTest("Basic Health Check", "fail", duration, {
        error: error.message,
      });

      return false;
    }
  }

  // Test comprehensive monitoring health
  async testMonitoringHealth() {
    const start = performance.now();

    try {
      const response = await this.client.get("/api/monitoring/health");
      const end = performance.now();
      const duration = end - start;

      const isHealthy =
        response.status === 200 &&
        response.data.status === "healthy" &&
        duration < 2000;

      const status =
        response.status === 200
          ? response.data.status === "healthy"
            ? "pass"
            : "warning"
          : "fail";

      this.logTest(
        "Monitoring Health Check",
        status,
        duration,
        {
          status: response.data.status,
          responseTime: response.data.responseTime,
          databaseConnected: response.data.health?.database?.connected,
          featuresAvailable:
            response.data.health?.features?.availabilityPercentage,
        },
        response.data.alerts || []
      );

      return isHealthy;
    } catch (error) {
      const end = performance.now();
      const duration = end - start;

      this.logTest("Monitoring Health Check", "fail", duration, {
        error: error.message,
      });

      return false;
    }
  }

  // Test performance metrics
  async testPerformanceMetrics() {
    const start = performance.now();

    try {
      const response = await this.client.get("/api/monitoring/metrics");
      const end = performance.now();
      const duration = end - start;

      const metrics = response.data.metrics;
      const isHealthy =
        response.status === 200 &&
        duration < 2000 &&
        metrics.performance.uptime >= 99.5 &&
        metrics.performance.errorRate < 5;

      const status =
        response.status === 200 ? (isHealthy ? "pass" : "warning") : "fail";

      this.logTest("Performance Metrics", status, duration, {
        uptime: metrics.performance?.uptime,
        errorRate: metrics.performance?.errorRate,
        avgResponseTime: metrics.performance?.avgResponseTime,
        requestCount: metrics.performance?.requestCount,
        databaseResponseTime: metrics.database?.responseTime,
      });

      return isHealthy;
    } catch (error) {
      const end = performance.now();
      const duration = end - start;

      this.logTest("Performance Metrics", "fail", duration, {
        error: error.message,
      });

      return false;
    }
  }

  // Test system alerts
  async testSystemAlerts() {
    const start = performance.now();

    try {
      const response = await this.client.get("/api/monitoring/alerts");
      const end = performance.now();
      const duration = end - start;

      const alerts = response.data.alerts || [];
      const criticalAlerts = alerts.filter((a) => a.level === "critical");
      const warningAlerts = alerts.filter((a) => a.level === "warning");

      const isHealthy =
        response.status === 200 &&
        duration < 2000 &&
        criticalAlerts.length === 0;

      const status =
        response.status === 200
          ? criticalAlerts.length === 0
            ? warningAlerts.length === 0
              ? "pass"
              : "warning"
            : "fail"
          : "fail";

      this.logTest(
        "System Alerts",
        status,
        duration,
        {
          totalAlerts: alerts.length,
          criticalAlerts: criticalAlerts.length,
          warningAlerts: warningAlerts.length,
          infoAlerts: alerts.filter((a) => a.level === "info").length,
        },
        criticalAlerts.concat(warningAlerts.slice(0, 3)) // Show critical + first 3 warnings
      );

      return isHealthy;
    } catch (error) {
      const end = performance.now();
      const duration = end - start;

      this.logTest("System Alerts", "fail", duration, { error: error.message });

      return false;
    }
  }

  // Test system status
  async testSystemStatus() {
    const start = performance.now();

    try {
      const response = await this.client.get("/api/monitoring/status");
      const end = performance.now();
      const duration = end - start;

      const status = response.data.status;
      const components = response.data.components;

      const isHealthy =
        response.status === 200 && duration < 2000 && status === "healthy";

      const testStatus =
        response.status === 200
          ? status === "healthy"
            ? "pass"
            : status === "degraded"
            ? "warning"
            : "fail"
          : "fail";

      this.logTest("System Status", testStatus, duration, {
        overallStatus: status,
        healthPercentage: response.data.summary?.healthPercentage,
        apiStatus: components?.api?.status,
        databaseStatus: components?.database?.status,
        featuresStatus: components?.features?.status,
        performanceStatus: components?.performance?.status,
      });

      return isHealthy;
    } catch (error) {
      const end = performance.now();
      const duration = end - start;

      this.logTest("System Status", "fail", duration, { error: error.message });

      return false;
    }
  }

  // Test readiness probe
  async testReadinessProbe() {
    const start = performance.now();

    try {
      const response = await this.client.get("/api/monitoring/ready");
      const end = performance.now();
      const duration = end - start;

      const isReady =
        response.status === 200 &&
        response.data.ready === true &&
        duration < 2000;

      this.logTest("Readiness Probe", isReady ? "pass" : "fail", duration, {
        ready: response.data.ready,
        checks: response.data.checks,
      });

      return isReady;
    } catch (error) {
      const end = performance.now();
      const duration = end - start;

      this.logTest("Readiness Probe", "fail", duration, {
        error: error.message,
      });

      return false;
    }
  }

  // Test liveness probe
  async testLivenessProbe() {
    const start = performance.now();

    try {
      const response = await this.client.get("/api/monitoring/live");
      const end = performance.now();
      const duration = end - start;

      const isAlive =
        response.status === 200 &&
        response.data.alive === true &&
        duration < 2000;

      this.logTest("Liveness Probe", isAlive ? "pass" : "fail", duration, {
        alive: response.data.alive,
        uptime: response.data.uptime,
      });

      return isAlive;
    } catch (error) {
      const end = performance.now();
      const duration = end - start;

      this.logTest("Liveness Probe", "fail", duration, {
        error: error.message,
      });

      return false;
    }
  }

  // Test cost monitoring
  async testCostMonitoring() {
    const start = performance.now();

    try {
      const response = await this.client.get("/api/monitoring/costs");
      const end = performance.now();
      const duration = end - start;

      const costData = response.data.data;
      const estimatedCost = costData?.estimatedMonthlyCost || 0;

      const isWithinBudget =
        response.status === 200 && duration < 2000 && estimatedCost <= 5; // Must be under $5/month

      const status =
        response.status === 200
          ? estimatedCost <= 5
            ? "pass"
            : "warning"
          : "fail";

      this.logTest("Cost Monitoring", status, duration, {
        estimatedMonthlyCost: estimatedCost,
        requestCount: costData?.requestCount,
        lambdaInvocations: costData?.lambdaInvocations,
        storageUsage: costData?.storageUsage,
      });

      return isWithinBudget;
    } catch (error) {
      const end = performance.now();
      const duration = end - start;

      this.logTest("Cost Monitoring", "fail", duration, {
        error: error.message,
      });

      return false;
    }
  }

  // Load test with concurrent requests
  async testConcurrentLoad(concurrency = 10) {
    const start = performance.now();

    try {
      const requests = Array(concurrency)
        .fill()
        .map(async (_, index) => {
          const reqStart = performance.now();
          try {
            const response = await this.client.get("/api/health");
            const reqEnd = performance.now();
            return {
              success: true,
              duration: reqEnd - reqStart,
              status: response.status,
              index,
            };
          } catch (error) {
            const reqEnd = performance.now();
            return {
              success: false,
              duration: reqEnd - reqStart,
              error: error.message,
              index,
            };
          }
        });

      const results = await Promise.all(requests);
      const end = performance.now();
      const totalDuration = end - start;

      const successCount = results.filter((r) => r.success).length;
      const avgDuration =
        results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const maxDuration = Math.max(...results.map((r) => r.duration));

      const isHealthy =
        successCount === concurrency &&
        avgDuration < 2000 &&
        maxDuration < 5000;

      this.logTest(
        "Concurrent Load Test",
        isHealthy ? "pass" : "warning",
        totalDuration,
        {
          concurrency,
          successRate: `${successCount}/${concurrency}`,
          avgResponseTime: Math.round(avgDuration),
          maxResponseTime: Math.round(maxDuration),
          totalDuration: Math.round(totalDuration),
        }
      );

      return isHealthy;
    } catch (error) {
      const end = performance.now();
      const duration = end - start;

      this.logTest("Concurrent Load Test", "fail", duration, {
        error: error.message,
      });

      return false;
    }
  }

  // Run all production health checks
  async runAllChecks() {
    console.log(`🚀 Starting Production Health Checks for: ${this.baseUrl}`);
    console.log(`📅 Started at: ${this.results.timestamp}\n`);

    const tests = [
      () => this.testBasicHealth(),
      () => this.testMonitoringHealth(),
      () => this.testPerformanceMetrics(),
      () => this.testSystemAlerts(),
      () => this.testSystemStatus(),
      () => this.testReadinessProbe(),
      () => this.testLivenessProbe(),
      () => this.testCostMonitoring(),
      () => this.testConcurrentLoad(5),
    ];

    // Run tests sequentially
    for (const test of tests) {
      try {
        await test();
        // Small delay between tests
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error("Test execution error:", error);
      }
    }

    return this.generateReport();
  }

  // Generate comprehensive report
  generateReport() {
    const { total, passed, failed, warnings } = this.results.summary;
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
    const overallHealth =
      failed === 0 ? (warnings === 0 ? "healthy" : "degraded") : "unhealthy";

    console.log("\n" + "=".repeat(80));
    console.log("📊 PRODUCTION HEALTH CHECK REPORT");
    console.log("=".repeat(80));
    console.log(`🎯 Target URL: ${this.baseUrl}`);
    console.log(`📅 Completed: ${new Date().toISOString()}`);
    console.log(`🏆 Overall Health: ${overallHealth.toUpperCase()}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`❌ Failed: ${failed}`);

    // Show critical issues
    const criticalTests = this.results.tests.filter((t) => t.status === "fail");
    if (criticalTests.length > 0) {
      console.log("\n❌ CRITICAL ISSUES:");
      criticalTests.forEach((test) => {
        console.log(`   • ${test.name}: ${test.details.error || "Failed"}`);
      });
    }

    // Show warnings
    const warningTests = this.results.tests.filter(
      (t) => t.status === "warning"
    );
    if (warningTests.length > 0) {
      console.log("\n⚠️  WARNINGS:");
      warningTests.forEach((test) => {
        console.log(`   • ${test.name}: Performance or availability concerns`);
      });
    }

    // Recommendations
    console.log("\n💡 RECOMMENDATIONS:");
    if (overallHealth === "healthy") {
      console.log("   • System is operating optimally! 🎉");
      console.log("   • Continue monitoring for any performance degradation");
    } else if (overallHealth === "degraded") {
      console.log("   • Address warning conditions to improve system health");
      console.log("   • Monitor system closely for potential issues");
    } else {
      console.log("   • Immediate attention required for critical issues");
      console.log("   • Check logs and system resources");
      console.log("   • Verify database connectivity and configuration");
    }

    console.log("=".repeat(80));

    return {
      success: failed === 0,
      overallHealth,
      summary: this.results.summary,
      successRate: parseFloat(successRate),
      tests: this.results.tests,
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
    };
  }
}

// CLI usage
if (require.main === module) {
  const baseUrl =
    process.argv[2] || process.env.API_BASE_URL || "http://localhost:5001";

  const checker = new ProductionHealthChecker(baseUrl);

  checker
    .runAllChecks()
    .then((report) => {
      process.exit(report.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Health check suite failed:", error);
      process.exit(1);
    });
}

module.exports = ProductionHealthChecker;
