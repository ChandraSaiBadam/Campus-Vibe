/**
 * Health Check Routes
 *
 * Comprehensive health check endpoints for monitoring and validation
 *
 * Requirements addressed:
 * - 4.2: API calls respond within 2 seconds
 * - 4.3: Uptime remains above 99.5% during high traffic
 * - 1.2: Application remains available and responsive
 */

const express = require("express");
const { healthChecker } = require("../utils/healthCheck");
const router = express.Router();

// Middleware to record request metrics
router.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const isError = res.statusCode >= 400;
    healthChecker.recordRequest(duration, isError);
  });

  next();
});

// Basic health check - GET /api/health/basic
router.get("/basic", async (req, res) => {
  try {
    const health = healthChecker.getBasicHealth();
    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: "error",
      message: "Health check failed",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Detailed health check - GET /api/health/detailed
router.get("/detailed", async (req, res) => {
  try {
    const health = await healthChecker.getDetailedHealth();

    // Determine overall status based on critical components
    const overallStatus =
      health.database.connected && health.performance.uptime > 95
        ? "healthy"
        : "degraded";

    res.json({
      ...health,
      overallStatus,
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      message: "Detailed health check failed",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Readiness probe - GET /api/health/ready
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

// Liveness probe - GET /api/health/live
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

// Feature validation - GET /api/health/features
router.get("/features", async (req, res) => {
  try {
    const features = await healthChecker.validateFeatures();

    const statusCode =
      features.summary.availabilityPercentage >= 80 ? 200 : 206;
    res.status(statusCode).json(features);
  } catch (error) {
    res.status(503).json({
      error: error.message,
      features: {},
      summary: {
        total: 0,
        available: 0,
        unavailable: 0,
        availabilityPercentage: 0,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// Performance benchmark - GET /api/health/benchmark
router.get("/benchmark", async (req, res) => {
  try {
    const benchmark = await healthChecker.runPerformanceBenchmark();

    if (benchmark.success) {
      res.json(benchmark);
    } else {
      res.status(500).json(benchmark);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      benchmarks: {},
      timestamp: new Date().toISOString(),
    });
  }
});

// Database connectivity test - GET /api/health/database
router.get("/database", async (req, res) => {
  try {
    const dbHealth = await healthChecker.checkDatabaseHealth();

    const statusCode = dbHealth.connected ? 200 : 503;
    res.status(statusCode).json(dbHealth);
  } catch (error) {
    res.status(503).json({
      status: "error",
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// System metrics - GET /api/health/metrics
router.get("/metrics", async (req, res) => {
  try {
    const detailed = await healthChecker.getDetailedHealth();

    // Extract just the metrics for monitoring systems
    const metrics = {
      uptime: detailed.uptime.seconds,
      requestCount: detailed.performance.requestCount,
      errorCount: detailed.performance.errorCount,
      errorRate: detailed.performance.errorRate,
      avgResponseTime: detailed.performance.avgResponseTime,
      memoryUsed: detailed.system.memory.used,
      memoryTotal: detailed.system.memory.total,
      databaseConnected: detailed.database.connected,
      databaseResponseTime: detailed.database.responseTime || 0,
      timestamp: detailed.timestamp,
    };

    res.json(metrics);
  } catch (error) {
    res.status(503).json({
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Comprehensive status - GET /api/health/status
router.get("/status", async (req, res) => {
  try {
    const [basic, detailed, readiness, features] = await Promise.all([
      healthChecker.getBasicHealth(),
      healthChecker.getDetailedHealth(),
      healthChecker.getReadinessStatus(),
      healthChecker.validateFeatures(),
    ]);

    const status = {
      service: "Campus Vibe API",
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      uptime: basic.uptime,
      ready: readiness.ready,
      alive: true,
      performance: detailed.performance,
      features: features.summary,
      database: {
        connected: detailed.database.connected,
        status: detailed.database.status,
        responseTime: detailed.database.responseTime,
      },
      system: detailed.system,
      overallHealth:
        readiness.ready &&
        detailed.performance.uptime > 95 &&
        features.summary.availabilityPercentage >= 80
          ? "healthy"
          : "degraded",
    };

    const statusCode = status.overallHealth === "healthy" ? 200 : 206;
    res.status(statusCode).json(status);
  } catch (error) {
    res.status(503).json({
      service: "Campus Vibe API",
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      overallHealth: "error",
      error: error.message,
    });
  }
});

module.exports = router;
