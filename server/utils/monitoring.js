/**
 * CloudWatch Monitoring and Metrics Collection Utility
 *
 * This module provides comprehensive monitoring capabilities for Lambda functions
 * including performance metrics, cost tracking, and error monitoring.
 *
 * Requirements addressed:
 * - 3.1: Basic metrics collection automatically
 * - 3.2: Error logging and accessibility
 * - 3.4: Cost monitoring with notifications
 */

const AWS = require("aws-sdk");

// Initialize CloudWatch client (only in Lambda environment)
let cloudWatch = null;
if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
  cloudWatch = new AWS.CloudWatch({
    region: process.env.AWS_REGION || "us-east-1",
  });
}

/**
 * Custom metrics namespace for the application
 */
const METRICS_NAMESPACE = "CampusVibe/Application";

/**
 * Log structured data to CloudWatch with proper formatting
 * @param {string} level - Log level (INFO, WARN, ERROR, DEBUG)
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata to log
 * @param {Object} context - Lambda context (optional)
 */
const logToCloudWatch = (level, message, metadata = {}, context = null) => {
  const timestamp = new Date().toISOString();

  // Create structured log entry
  const logEntry = {
    timestamp,
    level,
    message,
    ...metadata,
  };

  // Add Lambda context if available
  if (context) {
    logEntry.lambda = {
      requestId: context.awsRequestId,
      functionName: context.functionName,
      functionVersion: context.functionVersion,
      remainingTime: context.getRemainingTimeInMillis(),
      memoryLimit: context.memoryLimitInMB,
    };
  }

  // Add performance metrics
  const memoryUsage = process.memoryUsage();
  logEntry.performance = {
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
    external: Math.round(memoryUsage.external / 1024 / 1024), // MB
    uptime: process.uptime(),
  };

  // Output structured JSON for CloudWatch Logs
  console.log(JSON.stringify(logEntry));
};

/**
 * Send custom metrics to CloudWatch
 * @param {string} metricName - Name of the metric
 * @param {number} value - Metric value
 * @param {string} unit - Metric unit (Count, Seconds, Bytes, etc.)
 * @param {Array} dimensions - Array of dimension objects
 */
const putMetric = async (
  metricName,
  value,
  unit = "Count",
  dimensions = []
) => {
  if (!cloudWatch) {
    // In local development, just log the metric
    console.log(`METRIC: ${metricName} = ${value} ${unit}`, dimensions);
    return;
  }

  try {
    const params = {
      Namespace: METRICS_NAMESPACE,
      MetricData: [
        {
          MetricName: metricName,
          Value: value,
          Unit: unit,
          Timestamp: new Date(),
          Dimensions: dimensions,
        },
      ],
    };

    await cloudWatch.putMetricData(params).promise();
  } catch (error) {
    console.error("Failed to put CloudWatch metric:", error);
  }
};

/**
 * Track API request metrics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} duration - Request duration in milliseconds
 */
const trackApiRequest = async (req, res, duration) => {
  const method = req.method;
  const route = req.route?.path || req.path || "unknown";
  const statusCode = res.statusCode;
  const statusClass = Math.floor(statusCode / 100) * 100; // 200, 400, 500, etc.

  const dimensions = [
    { Name: "Method", Value: method },
    { Name: "Route", Value: route },
    { Name: "StatusCode", Value: statusCode.toString() },
    { Name: "StatusClass", Value: `${statusClass}xx` },
  ];

  // Track request count
  await putMetric("ApiRequests", 1, "Count", dimensions);

  // Track response time
  await putMetric("ApiResponseTime", duration, "Milliseconds", dimensions);

  // Track errors separately
  if (statusCode >= 400) {
    await putMetric("ApiErrors", 1, "Count", dimensions);
  }

  // Log the request for CloudWatch Logs
  logToCloudWatch("INFO", "API Request", {
    method,
    route,
    statusCode,
    duration: `${duration}ms`,
    userAgent: req.get("User-Agent"),
    ip: req.ip || req.connection?.remoteAddress,
  });
};

/**
 * Track database operation metrics
 * @param {string} operation - Database operation (find, create, update, delete)
 * @param {string} collection - Collection name
 * @param {number} duration - Operation duration in milliseconds
 * @param {boolean} success - Whether operation was successful
 */
const trackDatabaseOperation = async (
  operation,
  collection,
  duration,
  success = true
) => {
  const dimensions = [
    { Name: "Operation", Value: operation },
    { Name: "Collection", Value: collection },
    { Name: "Success", Value: success.toString() },
  ];

  // Track operation count
  await putMetric("DatabaseOperations", 1, "Count", dimensions);

  // Track operation duration
  await putMetric("DatabaseResponseTime", duration, "Milliseconds", dimensions);

  // Track errors separately
  if (!success) {
    await putMetric("DatabaseErrors", 1, "Count", dimensions);
  }

  // Log the operation
  logToCloudWatch(success ? "INFO" : "ERROR", "Database Operation", {
    operation,
    collection,
    duration: `${duration}ms`,
    success,
  });
};

/**
 * Track Lambda cold start metrics
 * @param {Object} context - Lambda context object
 */
const trackColdStart = async (context) => {
  const dimensions = [
    { Name: "FunctionName", Value: context.functionName },
    { Name: "FunctionVersion", Value: context.functionVersion },
  ];

  await putMetric("ColdStarts", 1, "Count", dimensions);

  logToCloudWatch(
    "INFO",
    "Lambda Cold Start",
    {
      functionName: context.functionName,
      functionVersion: context.functionVersion,
      memoryLimit: context.memoryLimitInMB,
    },
    context
  );
};

/**
 * Track memory usage metrics
 * @param {Object} context - Lambda context object (optional)
 */
const trackMemoryUsage = async (context = null) => {
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);

  const dimensions = context
    ? [{ Name: "FunctionName", Value: context.functionName }]
    : [];

  // Track heap usage
  await putMetric("MemoryHeapUsed", heapUsedMB, "Count", dimensions);
  await putMetric("MemoryHeapTotal", heapTotalMB, "Count", dimensions);

  // Calculate memory utilization percentage
  const memoryLimit = context?.memoryLimitInMB || heapTotalMB;
  const utilizationPercent = Math.round((heapUsedMB / memoryLimit) * 100);
  await putMetric(
    "MemoryUtilization",
    utilizationPercent,
    "Percent",
    dimensions
  );

  // Log memory usage
  logToCloudWatch(
    "DEBUG",
    "Memory Usage",
    {
      heapUsed: `${heapUsedMB}MB`,
      heapTotal: `${heapTotalMB}MB`,
      memoryLimit: `${memoryLimit}MB`,
      utilization: `${utilizationPercent}%`,
    },
    context
  );
};

/**
 * Track cost-related metrics
 * @param {Object} context - Lambda context object
 * @param {number} duration - Execution duration in milliseconds
 */
const trackCostMetrics = async (context, duration) => {
  if (!context) return;

  const memoryMB = context.memoryLimitInMB;
  const durationSeconds = duration / 1000;

  // Calculate GB-seconds (AWS billing unit)
  const gbSeconds = (memoryMB / 1024) * durationSeconds;

  const dimensions = [
    { Name: "FunctionName", Value: context.functionName },
    { Name: "MemorySize", Value: memoryMB.toString() },
  ];

  // Track execution time and cost metrics
  await putMetric("ExecutionDuration", duration, "Milliseconds", dimensions);
  await putMetric("ExecutionGBSeconds", gbSeconds, "Count", dimensions);

  // Estimate cost (approximate AWS Lambda pricing)
  const costPerGBSecond = 0.0000166667; // USD per GB-second (as of 2024)
  const estimatedCost = gbSeconds * costPerGBSecond;
  await putMetric("EstimatedCost", estimatedCost, "Count", dimensions);

  logToCloudWatch(
    "INFO",
    "Cost Metrics",
    {
      duration: `${duration}ms`,
      memoryMB,
      gbSeconds: gbSeconds.toFixed(6),
      estimatedCost: `$${estimatedCost.toFixed(8)}`,
    },
    context
  );
};

/**
 * Express middleware for automatic request monitoring
 */
const monitoringMiddleware = () => {
  return (req, res, next) => {
    const startTime = Date.now();

    // Override res.end to capture response metrics
    const originalEnd = res.end;
    res.end = function (...args) {
      const duration = Date.now() - startTime;

      // Track the request asynchronously (don't block response)
      setImmediate(() => {
        trackApiRequest(req, res, duration).catch((error) => {
          console.error("Failed to track API request:", error);
        });
      });

      // Call original end method
      originalEnd.apply(this, args);
    };

    next();
  };
};

/**
 * Create a monitoring wrapper for database operations
 * @param {Function} operation - Database operation function
 * @param {string} operationType - Type of operation (find, create, update, delete)
 * @param {string} collection - Collection name
 */
const monitorDatabaseOperation = (operation, operationType, collection) => {
  return async (...args) => {
    const startTime = Date.now();
    let success = true;
    let result;

    try {
      result = await operation(...args);
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = Date.now() - startTime;

      // Track the operation asynchronously
      setImmediate(() => {
        trackDatabaseOperation(
          operationType,
          collection,
          duration,
          success
        ).catch((error) => {
          console.error("Failed to track database operation:", error);
        });
      });
    }
  };
};

/**
 * Initialize monitoring for Lambda function
 * @param {Object} context - Lambda context object
 */
const initializeMonitoring = async (context) => {
  try {
    // Track cold start if this is a new container
    if (!global.lambdaInitialized) {
      await trackColdStart(context);
      global.lambdaInitialized = true;
    }

    // Set up periodic memory monitoring
    const memoryMonitorInterval = setInterval(async () => {
      try {
        await trackMemoryUsage(context);
      } catch (error) {
        console.error("Memory monitoring error:", error);
      }
    }, 30000); // Every 30 seconds

    // Clear interval when Lambda container is about to be destroyed
    process.on("beforeExit", () => {
      clearInterval(memoryMonitorInterval);
    });

    logToCloudWatch(
      "INFO",
      "Monitoring Initialized",
      {
        functionName: context.functionName,
        memoryLimit: context.memoryLimitInMB,
      },
      context
    );
  } catch (error) {
    console.error("Failed to initialize monitoring:", error);
  }
};

module.exports = {
  logToCloudWatch,
  putMetric,
  trackApiRequest,
  trackDatabaseOperation,
  trackColdStart,
  trackMemoryUsage,
  trackCostMetrics,
  monitoringMiddleware,
  monitorDatabaseOperation,
  initializeMonitoring,
  METRICS_NAMESPACE,
};
