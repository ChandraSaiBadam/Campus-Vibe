/**
 * AWS Lambda Handler for Campus Vibe API
 *
 * This file properly exports the serverless function handler for AWS Lambda
 * with optimized ARM64 architecture, memory settings, CORS configuration,
 * and comprehensive monitoring and cost tracking.
 *
 * Requirements addressed:
 * - 1.2: Proper Lambda function export and configuration
 * - 1.3: ARM64 architecture and optimized memory settings
 * - 2.2: CORS configuration for API Gateway
 * - 3.1: Basic metrics collection automatically
 * - 3.2: Error logging and accessibility
 * - 3.4: Cost monitoring with notifications
 */

const serverless = require("serverless-http");
const app = require("./app");
const {
  logToCloudWatch,
  trackCostMetrics,
  initializeMonitoring,
} = require("./utils/monitoring");
const { trackLambdaCost } = require("./utils/costMonitoring");

// Configure serverless-http with ARM64 optimizations for Lambda
const serverlessHandler = serverless(app, {
  // Binary media types for file uploads
  binary: ["image/*", "application/pdf", "application/octet-stream"],

  // ARM64 and memory optimizations
  stripBasePath: true,

  // Request/response transformations optimized for ARM64
  request: (request, event, context) => {
    // Add Lambda context to request for debugging and monitoring
    request.context = context;
    request.event = event;

    // Add request timing for performance monitoring
    request.startTime = Date.now();

    // Enhanced logging with monitoring integration
    logToCloudWatch(
      "INFO",
      "Lambda Request Started",
      {
        method: event.httpMethod,
        path: event.path,
        userAgent: event.headers?.["User-Agent"],
        sourceIp: event.requestContext?.identity?.sourceIp,
        architecture: process.arch, // Should show 'arm64'
      },
      context
    );
  },

  // Response transformations with proper CORS handling and monitoring
  response: (response, event, context) => {
    // Add security headers
    response.headers = response.headers || {};
    response.headers["X-Content-Type-Options"] = "nosniff";
    response.headers["X-Frame-Options"] = "DENY";
    response.headers["X-XSS-Protection"] = "1; mode=block";
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

    // Add proper CORS headers if not already set
    const origin = event.headers?.origin || event.headers?.Origin;
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      "http://localhost:3000",
      "https://localhost:3000",
    ].filter(Boolean);

    if (!response.headers["Access-Control-Allow-Origin"]) {
      const corsOrigin = allowedOrigins.includes(origin)
        ? origin
        : allowedOrigins[0] || "*";
      response.headers["Access-Control-Allow-Origin"] = corsOrigin;
      response.headers["Access-Control-Allow-Credentials"] = "false";
    }

    // Add Lambda-specific headers for debugging (development only)
    if (process.env.NODE_ENV === "development") {
      response.headers["X-Lambda-Request-Id"] = context.awsRequestId;
      response.headers["X-Lambda-Function-Name"] = context.functionName;
      response.headers["X-Lambda-Architecture"] = process.arch;
    }

    // Enhanced performance monitoring and cost tracking
    const duration = Date.now() - (event.startTime || Date.now());
    const memoryUsage = process.memoryUsage();

    // Log response with comprehensive metrics
    logToCloudWatch(
      "INFO",
      "Lambda Response Completed",
      {
        statusCode: response.statusCode,
        duration: `${duration}ms`,
        remainingTime: `${context.getRemainingTimeInMillis()}ms`,
        memoryUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        memoryTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        success: response.statusCode < 400,
      },
      context
    );

    // Track cost metrics asynchronously
    setImmediate(() => {
      try {
        trackCostMetrics(context, duration);
        trackLambdaCost(context, duration);
      } catch (error) {
        console.error("Failed to track cost metrics:", error);
      }
    });

    return response;
  },
});

// Export the handler with comprehensive error handling and monitoring
module.exports.handler = async (event, context) => {
  const executionStartTime = Date.now();

  // Initialize monitoring for this Lambda execution
  await initializeMonitoring(context);

  // Handle CORS preflight requests with proper origin validation
  if (event.httpMethod === "OPTIONS") {
    const origin = event.headers?.origin || event.headers?.Origin;
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      "http://localhost:3000",
      "https://localhost:3000",
    ].filter(Boolean);

    const corsOrigin = allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins[0] || "*";

    logToCloudWatch(
      "INFO",
      "CORS Preflight Request",
      { origin, corsOrigin },
      context
    );

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Requested-With, X-Amz-Date, X-Api-Key, X-Amz-Security-Token, Accept, Accept-Language, Accept-Encoding, Cache-Control",
        "Access-Control-Allow-Credentials": "false",
        "Access-Control-Max-Age": "86400",
      },
      body: "",
    };
  }

  // Enable connection reuse for MongoDB (critical for performance)
  context.callbackWaitsForEmptyEventLoop = false;

  // Performance monitoring setup
  const performanceMetrics = {
    startTime: executionStartTime,
    memoryStart: process.memoryUsage(),
    cpuStart: process.cpuUsage(),
  };

  // Set up timeout warning with monitoring
  const timeoutWarning = setTimeout(() => {
    const currentMetrics = {
      remainingTime: context.getRemainingTimeInMillis(),
      executionDuration: Date.now() - executionStartTime,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(performanceMetrics.cpuStart),
    };

    logToCloudWatch(
      "WARN",
      "Lambda Timeout Warning - Performance Alert",
      currentMetrics,
      context
    );
  }, Math.max(context.getRemainingTimeInMillis() - 5000, 1000)); // Warn 5 seconds before timeout, minimum 1 second

  try {
    // Clear timeout warning on successful completion
    clearTimeout(timeoutWarning);

    const result = await serverlessHandler(event, context);
    const executionDuration = Date.now() - executionStartTime;

    // Calculate comprehensive performance metrics
    const finalMemory = process.memoryUsage();
    const finalCpu = process.cpuUsage(performanceMetrics.cpuStart);

    const performanceReport = {
      statusCode: result.statusCode,
      executionDuration: `${executionDuration}ms`,
      remainingTime: `${context.getRemainingTimeInMillis()}ms`,
      memoryUsage: {
        heapUsed: `${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(finalMemory.heapTotal / 1024 / 1024)}MB`,
        memoryDelta: `${Math.round(
          (finalMemory.heapUsed - performanceMetrics.memoryStart.heapUsed) /
            1024 /
            1024
        )}MB`,
      },
      cpuUsage: {
        user: `${Math.round(finalCpu.user / 1000)}ms`,
        system: `${Math.round(finalCpu.system / 1000)}ms`,
      },
      performance: {
        isOptimal:
          executionDuration < 2000 && finalMemory.heapUsed < 200 * 1024 * 1024, // < 2s and < 200MB
        responseTime: executionDuration < 2000 ? "GOOD" : "NEEDS_OPTIMIZATION",
        memoryEfficiency:
          finalMemory.heapUsed < 200 * 1024 * 1024 ? "GOOD" : "HIGH_USAGE",
      },
    };

    // Log successful execution with comprehensive metrics
    logToCloudWatch(
      "INFO",
      "Lambda Execution Completed Successfully",
      performanceReport,
      context
    );

    return result;
  } catch (error) {
    // Clear timeout warning on error
    clearTimeout(timeoutWarning);
    const executionDuration = Date.now() - executionStartTime;

    // Enhanced error logging with monitoring integration
    logToCloudWatch(
      "ERROR",
      "Lambda Handler Error",
      {
        error: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        executionDuration: `${executionDuration}ms`,
        remainingTime: `${context.getRemainingTimeInMillis()}ms`,
        event: {
          httpMethod: event.httpMethod,
          path: event.path,
          userAgent: event.headers?.["User-Agent"],
        },
        memoryUsage: {
          heapUsed: `${Math.round(
            process.memoryUsage().heapUsed / 1024 / 1024
          )}MB`,
          heapTotal: `${Math.round(
            process.memoryUsage().heapTotal / 1024 / 1024
          )}MB`,
        },
      },
      context
    );

    // Determine appropriate status code based on error type
    let statusCode = 500;
    let errorMessage = "Internal server error";

    if (error.name === "ValidationError") {
      statusCode = 400;
      errorMessage = "Invalid request data";
    } else if (
      error.name === "UnauthorizedError" ||
      error.name === "JsonWebTokenError"
    ) {
      statusCode = 401;
      errorMessage = "Unauthorized access";
    } else if (error.name === "ForbiddenError") {
      statusCode = 403;
      errorMessage = "Access forbidden";
    } else if (error.name === "NotFoundError") {
      statusCode = 404;
      errorMessage = "Resource not found";
    } else if (
      error.code === "ECONNREFUSED" ||
      error.name === "MongoNetworkError"
    ) {
      statusCode = 503;
      errorMessage = "Service temporarily unavailable";
    }

    // Track error metrics
    setImmediate(() => {
      try {
        trackCostMetrics(context, executionDuration);
        trackLambdaCost(context, executionDuration);
      } catch (trackingError) {
        console.error("Failed to track error metrics:", trackingError);
      }
    });

    // Return structured error response with proper CORS headers
    const origin = event.headers?.origin || event.headers?.Origin;
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      "http://localhost:3000",
      "https://localhost:3000",
    ].filter(Boolean);

    const corsOrigin = allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins[0] || "*";

    return {
      statusCode,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Requested-With, X-Amz-Date, X-Api-Key, X-Amz-Security-Token, Accept, Accept-Language, Accept-Encoding, Cache-Control",
        "Access-Control-Allow-Credentials": "false",
        "Access-Control-Max-Age": "86400",
      },
      body: JSON.stringify({
        error: errorMessage,
        message:
          process.env.NODE_ENV === "development" ? error.message : errorMessage,
        requestId: context.awsRequestId,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
