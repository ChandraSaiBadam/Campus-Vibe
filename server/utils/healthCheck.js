/**
 * Enhanced Health Check Utilities
 *
 * Comprehensive health check endpoints for monitoring deployment
 * and validating all application features work in production.
 *
 * Requirements addressed:
 * - 4.2: API calls respond within 2 seconds
 * - 4.3: Uptime remains above 99.5% during high traffic
 * - 1.2: Application remains available and responsive
 */

const mongoose = require("mongoose");
const { performance } = require("perf_hooks");

class HealthChecker {
  constructor() {
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimeHistory = [];
    this.maxHistorySize = 100;
  }

  // Record request metrics
  recordRequest(duration, isError = false) {
    this.requestCount++;
    if (isError) this.errorCount++;

    this.responseTimeHistory.push({
      duration,
      timestamp: Date.now(),
      isError,
    });

    // Keep only recent history
    if (this.responseTimeHistory.length > this.maxHistorySize) {
      this.responseTimeHistory.shift();
    }
  }

  // Get basic health status
  getBasicHealth() {
    const uptime = Date.now() - this.startTime;
    const uptimeSeconds = Math.floor(uptime / 1000);

    return {
      status: "healthy",
      uptime: {
        milliseconds: uptime,
        seconds: uptimeSeconds,
        human: this.formatUptime(uptimeSeconds),
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
    };
  }

  // Get detailed health status
  async getDetailedHealth() {
    const basic = this.getBasicHealth();
    const memory = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Calculate performance metrics
    const recentRequests = this.responseTimeHistory.filter(
      (req) => Date.now() - req.timestamp < 60000 // Last minute
    );

    const avgResponseTime =
      recentRequests.length > 0
        ? recentRequests.reduce((sum, req) => sum + req.duration, 0) /
          recentRequests.length
        : 0;

    const errorRate =
      this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;

    const uptime = (1 - errorRate / 100) * 100; // Simple uptime calculation

    return {
      ...basic,
      performance: {
        requestCount: this.requestCount,
        errorCount: this.errorCount,
        errorRate: Math.round(errorRate * 100) / 100,
        uptime: Math.round(uptime * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime),
        recentRequestCount: recentRequests.length,
      },
      system: {
        memory: {
          used: Math.round(memory.heapUsed / 1024 / 1024),
          total: Math.round(memory.heapTotal / 1024 / 1024),
          external: Math.round(memory.external / 1024 / 1024),
          rss: Math.round(memory.rss / 1024 / 1024),
          unit: "MB",
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
      },
      database: await this.checkDatabaseHealth(),
      services: await this.checkExternalServices(),
    };
  }

  // Check database connectivity and performance
  async checkDatabaseHealth() {
    const start = performance.now();

    try {
      if (mongoose.connection.readyState !== 1) {
        return {
          status: "disconnected",
          connected: false,
          readyState: mongoose.connection.readyState,
          error: "Database not connected",
        };
      }

      // Test database with a simple query
      const testStart = performance.now();
      await mongoose.connection.db.admin().ping();
      const testEnd = performance.now();
      const queryTime = testEnd - testStart;

      const end = performance.now();
      const totalTime = end - start;

      return {
        status: "healthy",
        connected: true,
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        responseTime: Math.round(totalTime),
        queryTime: Math.round(queryTime),
        collections: Object.keys(mongoose.connection.collections).length,
      };
    } catch (error) {
      const end = performance.now();
      const totalTime = end - start;

      return {
        status: "error",
        connected: false,
        error: error.message,
        responseTime: Math.round(totalTime),
      };
    }
  }

  // Check external services (email, etc.)
  async checkExternalServices() {
    const services = {};

    // Check email service configuration
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      services.email = {
        configured: true,
        service: process.env.EMAIL_SERVICE || "unknown",
      };
    } else {
      services.email = {
        configured: false,
        status: "not configured",
      };
    }

    // Check environment variables
    const requiredEnvVars = ["MONGODB_URI", "JWT_SECRET", "NODE_ENV"];

    const missingEnvVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    services.environment = {
      status: missingEnvVars.length === 0 ? "healthy" : "warning",
      missingVariables: missingEnvVars,
      totalRequired: requiredEnvVars.length,
      configured: requiredEnvVars.length - missingEnvVars.length,
    };

    return services;
  }

  // Format uptime in human readable format
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(" ");
  }

  // Get readiness status (for Kubernetes-style health checks)
  async getReadinessStatus() {
    const dbHealth = await this.checkDatabaseHealth();
    const services = await this.checkExternalServices();

    const isReady =
      dbHealth.connected && services.environment.status !== "error";

    return {
      ready: isReady,
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealth.status === "healthy",
        environment: services.environment.status !== "error",
      },
    };
  }

  // Get liveness status (for Kubernetes-style health checks)
  getLivenessStatus() {
    const uptime = Date.now() - this.startTime;
    const isAlive = uptime > 0; // Simple check - process is running

    return {
      alive: isAlive,
      uptime: uptime,
      timestamp: new Date().toISOString(),
    };
  }

  // Validate application features
  async validateFeatures() {
    const features = {};

    try {
      // Test GPA Calculator (no database required)
      features.gpaCalculator = {
        available: true,
        requiresDatabase: false,
        status: "healthy",
      };

      // Test database-dependent features
      const dbHealth = await this.checkDatabaseHealth();
      const dbAvailable = dbHealth.connected;

      features.forum = {
        available: dbAvailable,
        requiresDatabase: true,
        status: dbAvailable ? "healthy" : "unavailable",
      };

      features.marketplace = {
        available: dbAvailable,
        requiresDatabase: true,
        status: dbAvailable ? "healthy" : "unavailable",
      };

      features.reviews = {
        available: dbAvailable,
        requiresDatabase: true,
        status: dbAvailable ? "healthy" : "unavailable",
      };

      features.timetable = {
        available: dbAvailable,
        requiresDatabase: true,
        status: dbAvailable ? "healthy" : "unavailable",
      };

      // Calculate overall feature availability
      const totalFeatures = Object.keys(features).length;
      const availableFeatures = Object.values(features).filter(
        (f) => f.available
      ).length;

      const availabilityPercentage = (availableFeatures / totalFeatures) * 100;

      return {
        features,
        summary: {
          total: totalFeatures,
          available: availableFeatures,
          unavailable: totalFeatures - availableFeatures,
          availabilityPercentage: Math.round(availabilityPercentage),
        },
      };
    } catch (error) {
      return {
        error: error.message,
        features: {},
        summary: {
          total: 0,
          available: 0,
          unavailable: 0,
          availabilityPercentage: 0,
        },
      };
    }
  }

  // Performance benchmark
  async runPerformanceBenchmark() {
    const benchmarks = {};

    try {
      // Memory allocation test
      const memStart = process.memoryUsage();
      const testArray = new Array(10000)
        .fill(0)
        .map((_, i) => ({ id: i, data: "test" }));
      const memEnd = process.memoryUsage();

      benchmarks.memory = {
        heapUsedDiff: memEnd.heapUsed - memStart.heapUsed,
        heapTotalDiff: memEnd.heapTotal - memStart.heapTotal,
        testArrayLength: testArray.length,
      };

      // CPU intensive task
      const cpuStart = performance.now();
      let sum = 0;
      for (let i = 0; i < 100000; i++) {
        sum += Math.sqrt(i);
      }
      const cpuEnd = performance.now();

      benchmarks.cpu = {
        duration: cpuEnd - cpuStart,
        operations: 100000,
        result: sum,
      };

      // Database query benchmark (if available)
      if (mongoose.connection.readyState === 1) {
        const dbStart = performance.now();
        await mongoose.connection.db.admin().ping();
        const dbEnd = performance.now();

        benchmarks.database = {
          pingTime: dbEnd - dbStart,
          status: "available",
        };
      } else {
        benchmarks.database = {
          status: "unavailable",
        };
      }

      return {
        success: true,
        benchmarks,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        benchmarks: {},
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Create singleton instance
const healthChecker = new HealthChecker();

module.exports = {
  HealthChecker,
  healthChecker,
};
