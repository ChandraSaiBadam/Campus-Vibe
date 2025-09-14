/**
 * Production Monitoring Routes
 *
 * Enhanced monitoring endpoints for production deployment validation
 * and continuous health monitoring.
 *
 * Requirements addressed:
 * - 3.1: Basic metrics collected automatically
 * - 3.2: Errors logged and accessible for review
 * - 3.3: Performance degradation alerts
 * - 4.2: API calls respond within 2 seconds
 */

const express = require("express");
const { healthChecker } = require("../utils/healthCheck");
const { getMetrics } = require("../utils/lambdaHealth");
const { getCostDashboard } = require("../utils/costMonitoring");

const router = express.Router();

// Production health check endpoint - GET /api/monitoring/health
router.get("/health", async (req, res) => {
  try {
    const start = Date.now();

    // Get comprehensive health data
    const [basicHealth, detailedHealth, features] = await Promise.all([
      healthChecker.getBasicHealth(),
      healthChecker.getDetailedHealth(),
      healthChecker.validateFeatures(),
    ]);

    const duration = Date.now() - start;

    // Determine overall status
    const isHealthy =
      detailedHealth.database.connected &&
      detailedHealth.performance.uptime > 95 &&
      features.summary.availabilityPercentage >= 80 &&
      duration < 2000; // Must respond within 2 seconds

    const status = isHealthy ? "healthy" : "degraded";
    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json({
      status,
      responseTime: duration,
      timestamp: new Date().toISOString(),
      health: {
        basic: basicHealth,
        performance: detailedHealth.performance,
        database: detailedHealth.database,
        features: features.summary,
      },
      alerts: generateHealthAlerts(detailedHealth, features, duration),
    });
  } catch (error) {
    const duration = Date.now() - Date.now();
    res.status(503).json({
      status: "error",
      responseTime: duration,
      timestamp: new Date().toISOString(),
      error: error.message,
      alerts: [
        {
          level: "critical",
          message: "Health check endpoint failed",
          timestamp: new Date().toISOString(),
        },
      ],
    });
  }
});

// Performance metrics endpoint - GET /api/monitoring/metrics
router.get("/metrics", async (req, res) => {
  try {
    const start = Date.now();

    const detailedHealth = await healthChecker.getDetailedHealth();
    const lambdaMetrics = getMetrics();
    const costData = getCostDashboard();

    const duration = Date.now() - start;

    res.json({
      responseTime: duration,
      timestamp: new Date().toISOString(),
      metrics: {
        performance: {
          requestCount: detailedHealth.performance.requestCount,
          errorCount: detailedHealth.performance.errorCount,
          errorRate: detailedHealth.performance.errorRate,
          avgResponseTime: detailedHealth.performance.avgResponseTime,
          uptime: detailedHealth.performance.uptime,
        },
        system: detailedHealth.system,
        lambda: lambdaMetrics,
        costs: costData,
        database: {
          status: detailedHealth.database.status,
          responseTime: detailedHealth.database.responseTime,
          connected: detailedHealth.database.connected,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to retrieve metrics",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Alerts endpoint - GET /api/monitoring/alerts
router.get("/alerts", async (req, res) => {
  try {
    const detailedHealth = await healthChecker.getDetailedHealth();
    const features = await healthChecker.validateFeatures();
    const costData = getCostDashboard();

    const alerts = [
      ...generateHealthAlerts(detailedHealth, features),
      ...generateCostAlerts(costData),
      ...generatePerformanceAlerts(detailedHealth),
    ];

    // Sort alerts by severity
    const sortedAlerts = alerts.sort((a, b) => {
      const severityOrder = { critical: 3, warning: 2, info: 1 };
      return severityOrder[b.level] - severityOrder[a.level];
    });

    res.json({
      alerts: sortedAlerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter((a) => a.level === "critical").length,
        warning: alerts.filter((a) => a.level === "warning").length,
        info: alerts.filter((a) => a.level === "info").length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to retrieve alerts",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// System status endpoint - GET /api/monitoring/status
router.get("/status", async (req, res) => {
  try {
    const start = Date.now();

    const [detailedHealth, features, benchmark] = await Promise.all([
      healthChecker.getDetailedHealth(),
      healthChecker.validateFeatures(),
      healthChecker.runPerformanceBenchmark(),
    ]);

    const duration = Date.now() - start;
    const lambdaMetrics = getMetrics();

    // Calculate overall system status
    const systemStatus = calculateSystemStatus(
      detailedHealth,
      features,
      benchmark,
      duration
    );

    res.json({
      status: systemStatus.overall,
      responseTime: duration,
      timestamp: new Date().toISOString(),
      components: {
        api: {
          status: duration < 2000 ? "healthy" : "slow",
          responseTime: duration,
        },
        database: {
          status: detailedHealth.database.connected ? "healthy" : "down",
          responseTime: detailedHealth.database.responseTime,
        },
        features: {
          status:
            features.summary.availabilityPercentage >= 80
              ? "healthy"
              : "degraded",
          availability: features.summary.availabilityPercentage,
        },
        performance: {
          status:
            detailedHealth.performance.uptime >= 99.5 ? "healthy" : "degraded",
          uptime: detailedHealth.performance.uptime,
          errorRate: detailedHealth.performance.errorRate,
        },
        lambda: {
          status:
            lambdaMetrics.invocations.coldStartRate < 50
              ? "healthy"
              : "warning",
          coldStartRate: lambdaMetrics.invocations.coldStartRate,
        },
      },
      summary: systemStatus.summary,
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Readiness probe for load balancers - GET /api/monitoring/ready
router.get("/ready", async (req, res) => {
  try {
    const readiness = await healthChecker.getReadinessStatus();

    if (readiness.ready) {
      res.json(readiness);
    } else {
      res.status(503).json(readiness);
    }
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Liveness probe for container orchestration - GET /api/monitoring/live
router.get("/live", (req, res) => {
  try {
    const liveness = healthChecker.getLivenessStatus();

    if (liveness.alive) {
      res.json(liveness);
    } else {
      res.status(503).json(liveness);
    }
  } catch (error) {
    res.status(503).json({
      alive: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Helper function to generate health alerts
function generateHealthAlerts(detailedHealth, features, responseTime = 0) {
  const alerts = [];

  // Database alerts
  if (!detailedHealth.database.connected) {
    alerts.push({
      level: "critical",
      component: "database",
      message: "Database connection lost",
      details: detailedHealth.database.error,
      timestamp: new Date().toISOString(),
    });
  } else if (detailedHealth.database.responseTime > 1000) {
    alerts.push({
      level: "warning",
      component: "database",
      message: "Database response time is slow",
      details: `Response time: ${detailedHealth.database.responseTime}ms`,
      timestamp: new Date().toISOString(),
    });
  }

  // Performance alerts
  if (detailedHealth.performance.uptime < 99.5) {
    alerts.push({
      level: "critical",
      component: "performance",
      message: "System uptime below threshold",
      details: `Uptime: ${detailedHealth.performance.uptime}%`,
      timestamp: new Date().toISOString(),
    });
  }

  if (detailedHealth.performance.errorRate > 5) {
    alerts.push({
      level: "warning",
      component: "performance",
      message: "High error rate detected",
      details: `Error rate: ${detailedHealth.performance.errorRate}%`,
      timestamp: new Date().toISOString(),
    });
  }

  if (responseTime > 2000) {
    alerts.push({
      level: "warning",
      component: "api",
      message: "API response time exceeds threshold",
      details: `Response time: ${responseTime}ms`,
      timestamp: new Date().toISOString(),
    });
  }

  // Feature availability alerts
  if (features.summary.availabilityPercentage < 80) {
    alerts.push({
      level: "warning",
      component: "features",
      message: "Feature availability below threshold",
      details: `Availability: ${features.summary.availabilityPercentage}%`,
      timestamp: new Date().toISOString(),
    });
  }

  // Memory alerts
  const memoryUsagePercent =
    (detailedHealth.system.memory.used / detailedHealth.system.memory.total) *
    100;
  if (memoryUsagePercent > 90) {
    alerts.push({
      level: "critical",
      component: "system",
      message: "High memory usage",
      details: `Memory usage: ${Math.round(memoryUsagePercent)}%`,
      timestamp: new Date().toISOString(),
    });
  } else if (memoryUsagePercent > 75) {
    alerts.push({
      level: "warning",
      component: "system",
      message: "Elevated memory usage",
      details: `Memory usage: ${Math.round(memoryUsagePercent)}%`,
      timestamp: new Date().toISOString(),
    });
  }

  return alerts;
}

// Helper function to generate cost alerts
function generateCostAlerts(costData) {
  const alerts = [];

  if (costData.estimatedMonthlyCost > 5) {
    alerts.push({
      level: "warning",
      component: "costs",
      message: "Monthly cost estimate exceeds budget",
      details: `Estimated cost: $${costData.estimatedMonthlyCost.toFixed(2)}`,
      timestamp: new Date().toISOString(),
    });
  }

  if (costData.requestCount > 10000) {
    alerts.push({
      level: "info",
      component: "costs",
      message: "High request volume detected",
      details: `Request count: ${costData.requestCount}`,
      timestamp: new Date().toISOString(),
    });
  }

  return alerts;
}

// Helper function to generate performance alerts
function generatePerformanceAlerts(detailedHealth) {
  const alerts = [];

  if (detailedHealth.performance.avgResponseTime > 1500) {
    alerts.push({
      level: "warning",
      component: "performance",
      message: "Average response time is high",
      details: `Avg response time: ${detailedHealth.performance.avgResponseTime}ms`,
      timestamp: new Date().toISOString(),
    });
  }

  if (detailedHealth.performance.recentRequestCount > 100) {
    alerts.push({
      level: "info",
      component: "performance",
      message: "High traffic volume",
      details: `Recent requests: ${detailedHealth.performance.recentRequestCount}`,
      timestamp: new Date().toISOString(),
    });
  }

  return alerts;
}

// Helper function to calculate overall system status
function calculateSystemStatus(
  detailedHealth,
  features,
  benchmark,
  responseTime
) {
  const checks = {
    api: responseTime < 2000,
    database: detailedHealth.database.connected,
    features: features.summary.availabilityPercentage >= 80,
    performance: detailedHealth.performance.uptime >= 99.5,
    benchmark: benchmark.success,
  };

  const passedChecks = Object.values(checks).filter(Boolean).length;
  const totalChecks = Object.keys(checks).length;
  const healthPercentage = (passedChecks / totalChecks) * 100;

  let overall;
  if (healthPercentage >= 90) {
    overall = "healthy";
  } else if (healthPercentage >= 70) {
    overall = "degraded";
  } else {
    overall = "unhealthy";
  }

  return {
    overall,
    summary: {
      healthPercentage: Math.round(healthPercentage),
      passedChecks,
      totalChecks,
      checks,
    },
  };
}

module.exports = router;
