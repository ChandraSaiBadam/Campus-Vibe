/**
 * Lambda-specific Health Check Utilities
 *
 * Health monitoring specifically designed for AWS Lambda deployment
 * with optimizations for serverless environments.
 *
 * Requirements addressed:
 * - 1.2: Application remains available and responsive
 * - 4.2: API calls respond within 2 seconds
 * - 4.3: Uptime remains above 99.5% during high traffic
 */

const { performance } = require("perf_hooks");

class LambdaHealthMonitor {
  constructor() {
    this.coldStarts = 0;
    this.warmStarts = 0;
    this.lastInvocation = null;
    this.invocationHistory = [];
    this.maxHistorySize = 50;
  }

  // Record Lambda invocation
  recordInvocation(context, isColdStart = false) {
    const invocation = {
      requestId: context?.awsRequestId || "unknown",
      timestamp: Date.now(),
      isColdStart,
      remainingTime: context?.getRemainingTimeInMillis?.() || 0,
      memoryLimit: context?.memoryLimitInMB || 0,
      functionName: process.env.AWS_LAMBDA_FUNCTION_NAME || "unknown",
      functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION || "unknown",
    };

    if (isColdStart) {
      this.coldStarts++;
    } else {
      this.warmStarts++;
    }

    this.lastInvocation = invocation;
    this.invocationHistory.push(invocation);

    // Keep history size manageable
    if (this.invocationHistory.length > this.maxHistorySize) {
      this.invocationHistory.shift();
    }

    return invocation;
  }

  // Get Lambda-specific health status
  getHealthStatus(context) {
    const now = Date.now();
    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

    if (!isLambda) {
      return {
        environment: "local",
        status: "running",
        timestamp: new Date().toISOString(),
      };
    }

    // Detect cold start (simple heuristic)
    const isColdStart =
      !this.lastInvocation || now - this.lastInvocation.timestamp > 300000; // 5 minutes

    // Record this invocation
    const currentInvocation = this.recordInvocation(context, isColdStart);

    // Calculate performance metrics
    const recentInvocations = this.invocationHistory.filter(
      (inv) => now - inv.timestamp < 300000 // Last 5 minutes
    );

    const coldStartRate =
      recentInvocations.length > 0
        ? (recentInvocations.filter((inv) => inv.isColdStart).length /
            recentInvocations.length) *
          100
        : 0;

    return {
      environment: "lambda",
      status: "healthy",
      lambda: {
        requestId: currentInvocation.requestId,
        functionName: currentInvocation.functionName,
        functionVersion: currentInvocation.functionVersion,
        memoryLimit: currentInvocation.memoryLimit,
        remainingTime: currentInvocation.remainingTime,
        isColdStart,
        coldStartRate: Math.round(coldStartRate * 100) / 100,
        totalInvocations: this.coldStarts + this.warmStarts,
        coldStarts: this.coldStarts,
        warmStarts: this.warmStarts,
      },
      performance: {
        recentInvocations: recentInvocations.length,
        avgRemainingTime:
          recentInvocations.length > 0
            ? Math.round(
                recentInvocations.reduce(
                  (sum, inv) => sum + inv.remainingTime,
                  0
                ) / recentInvocations.length
              )
            : 0,
      },
      timestamp: new Date().toISOString(),
    };
  }

  // Lambda warm-up function
  async warmUp() {
    const start = performance.now();

    try {
      // Perform warm-up tasks
      const tasks = [
        // Memory allocation
        () => new Array(1000).fill(0).map((_, i) => i * 2),

        // CPU warm-up
        () => {
          let sum = 0;
          for (let i = 0; i < 10000; i++) {
            sum += Math.sqrt(i);
          }
          return sum;
        },

        // Environment check
        () => ({
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          memoryUsage: process.memoryUsage(),
        }),
      ];

      const results = await Promise.all(tasks.map((task) => task()));

      const end = performance.now();
      const duration = end - start;

      return {
        success: true,
        duration: Math.round(duration),
        tasks: results.length,
        memory: results[2].memoryUsage,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const end = performance.now();
      const duration = end - start;

      return {
        success: false,
        duration: Math.round(duration),
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Get Lambda metrics for monitoring
  getMetrics() {
    const now = Date.now();
    const recentInvocations = this.invocationHistory.filter(
      (inv) => now - inv.timestamp < 300000 // Last 5 minutes
    );

    return {
      invocations: {
        total: this.coldStarts + this.warmStarts,
        recent: recentInvocations.length,
        coldStarts: this.coldStarts,
        warmStarts: this.warmStarts,
        coldStartRate:
          recentInvocations.length > 0
            ? (recentInvocations.filter((inv) => inv.isColdStart).length /
                recentInvocations.length) *
              100
            : 0,
      },
      performance: {
        avgRemainingTime:
          recentInvocations.length > 0
            ? recentInvocations.reduce(
                (sum, inv) => sum + inv.remainingTime,
                0
              ) / recentInvocations.length
            : 0,
        minRemainingTime:
          recentInvocations.length > 0
            ? Math.min(...recentInvocations.map((inv) => inv.remainingTime))
            : 0,
        maxRemainingTime:
          recentInvocations.length > 0
            ? Math.max(...recentInvocations.map((inv) => inv.remainingTime))
            : 0,
      },
      lastInvocation: this.lastInvocation,
      timestamp: new Date().toISOString(),
    };
  }
}

// Create singleton instance
const lambdaHealthMonitor = new LambdaHealthMonitor();

// Export functions for use in app.js
module.exports = {
  LambdaHealthMonitor,
  lambdaHealthMonitor,
  getHealthStatus: (context) => lambdaHealthMonitor.getHealthStatus(context),
  warmUp: () => lambdaHealthMonitor.warmUp(),
  getMetrics: () => lambdaHealthMonitor.getMetrics(),
  recordInvocation: (context, isColdStart) =>
    lambdaHealthMonitor.recordInvocation(context, isColdStart),
};
