/**
 * Performance Configuration for Campus Vibe API
 *
 * Optimizes Lambda and API Gateway performance for cost-effective deployment
 * Requirements addressed:
 * - 1.1: Minimize costs while maintaining performance
 * - 4.1: Frontend loads within 3 seconds globally
 * - 4.2: API calls respond within 2 seconds
 */

// Cache configuration for different endpoint types
const CACHE_CONFIGS = {
  // Static data that changes infrequently
  STATIC: {
    ttl: 3600, // 1 hour
    headers: ["Accept", "Accept-Language"],
    queryParams: ["page", "limit", "sort"],
  },

  // Dynamic data that changes moderately
  DYNAMIC: {
    ttl: 300, // 5 minutes
    headers: ["Accept", "Accept-Language", "Authorization"],
    queryParams: ["page", "limit", "sort", "search", "category"],
  },

  // Real-time data that changes frequently
  REALTIME: {
    ttl: 60, // 1 minute
    headers: ["Accept", "Accept-Language", "Authorization"],
    queryParams: ["page", "limit"],
  },

  // No caching for user-specific or write operations
  NO_CACHE: {
    ttl: 0,
    headers: [],
    queryParams: [],
  },
};

// Endpoint-specific cache configuration
const ENDPOINT_CACHE_MAP = {
  // Static content - cache aggressively
  "/api/courses": CACHE_CONFIGS.STATIC,
  "/api/faculty": CACHE_CONFIGS.STATIC,
  "/api/slots": CACHE_CONFIGS.STATIC,

  // Semi-dynamic content - moderate caching
  "/api/reviews": CACHE_CONFIGS.DYNAMIC,
  "/api/questions": CACHE_CONFIGS.DYNAMIC,
  "/api/marketplace": CACHE_CONFIGS.DYNAMIC,

  // Real-time content - minimal caching
  "/api/comments": CACHE_CONFIGS.REALTIME,
  "/api/votes": CACHE_CONFIGS.REALTIME,

  // No caching for user operations
  "/api/auth": CACHE_CONFIGS.NO_CACHE,
  "/api/users": CACHE_CONFIGS.NO_CACHE,
  "/api/timetables": CACHE_CONFIGS.NO_CACHE,
};

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  // Response time targets (milliseconds)
  RESPONSE_TIME: {
    EXCELLENT: 500,
    GOOD: 1000,
    ACCEPTABLE: 2000,
    POOR: 5000,
  },

  // Memory usage targets (MB)
  MEMORY_USAGE: {
    LOW: 128,
    OPTIMAL: 256,
    HIGH: 512,
    CRITICAL: 1024,
  },

  // CPU usage targets (percentage)
  CPU_USAGE: {
    LOW: 25,
    OPTIMAL: 50,
    HIGH: 75,
    CRITICAL: 90,
  },

  // Concurrent execution limits
  CONCURRENCY: {
    RESERVED: 100,
    PROVISIONED: 5, // Only for production
    BURST_LIMIT: 2000,
  },
};

// Lambda optimization settings
const LAMBDA_OPTIMIZATIONS = {
  // Memory configurations for different workloads
  MEMORY_CONFIGS: {
    LIGHT: 256, // Simple CRUD operations
    MEDIUM: 512, // Complex queries, file processing
    HEAVY: 1024, // Data analysis, large file processing
  },

  // Timeout configurations
  TIMEOUT_CONFIGS: {
    QUICK: 15, // Simple operations
    STANDARD: 30, // Most operations
    EXTENDED: 60, // Complex operations
  },

  // Environment optimizations
  ENVIRONMENT: {
    AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
    NODE_OPTIONS: "--enable-source-maps --max-old-space-size=512",
    UV_THREADPOOL_SIZE: "4",
  },
};

// API Gateway optimization settings
const API_GATEWAY_OPTIMIZATIONS = {
  // Compression settings
  COMPRESSION: {
    minimumSize: 1024, // 1KB minimum for compression
    contentTypes: [
      "application/json",
      "text/plain",
      "text/html",
      "text/css",
      "application/javascript",
      "text/xml",
      "application/xml",
    ],
  },

  // Rate limiting by endpoint type
  RATE_LIMITS: {
    PUBLIC: {
      rateLimit: 1000,
      burstLimit: 2000,
    },
    AUTHENTICATED: {
      rateLimit: 2000,
      burstLimit: 4000,
    },
    ADMIN: {
      rateLimit: 5000,
      burstLimit: 10000,
    },
  },

  // CORS optimization
  CORS: {
    maxAge: 86400, // 24 hours
    credentials: false,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    headers: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Accept-Language",
      "Accept-Encoding",
      "Cache-Control",
    ],
  },
};

// Performance monitoring configuration
const MONITORING_CONFIG = {
  // Metrics to track
  METRICS: [
    "Duration",
    "Errors",
    "Throttles",
    "ConcurrentExecutions",
    "MemoryUtilization",
    "IteratorAge",
  ],

  // Alarm thresholds
  ALARMS: {
    ERROR_RATE: 5, // 5% error rate
    DURATION: 2000, // 2 second average duration
    THROTTLES: 1, // Any throttling
    MEMORY: 80, // 80% memory utilization
  },

  // Log levels by environment
  LOG_LEVELS: {
    development: "DEBUG",
    staging: "INFO",
    production: "WARN",
  },
};

// Cost optimization settings
const COST_OPTIMIZATIONS = {
  // Reserved concurrency to prevent runaway costs
  CONCURRENCY_LIMITS: {
    development: 10,
    staging: 50,
    production: 100,
  },

  // Log retention to minimize storage costs
  LOG_RETENTION: {
    development: 3, // 3 days
    staging: 7, // 1 week
    production: 14, // 2 weeks
  },

  // X-Ray tracing (disable in dev to save costs)
  TRACING: {
    development: false,
    staging: true,
    production: true,
  },
};

/**
 * Get cache configuration for a specific endpoint
 * @param {string} endpoint - API endpoint path
 * @param {string} method - HTTP method
 * @returns {Object} Cache configuration
 */
const getCacheConfig = (endpoint, method = "GET") => {
  // Only cache GET requests
  if (method !== "GET") {
    return CACHE_CONFIGS.NO_CACHE;
  }

  // Find matching endpoint configuration
  for (const [pattern, config] of Object.entries(ENDPOINT_CACHE_MAP)) {
    if (endpoint.startsWith(pattern)) {
      return config;
    }
  }

  // Default to dynamic caching for unknown endpoints
  return CACHE_CONFIGS.DYNAMIC;
};

/**
 * Get optimal Lambda configuration based on endpoint
 * @param {string} endpoint - API endpoint path
 * @returns {Object} Lambda configuration
 */
const getLambdaConfig = (endpoint) => {
  // Heavy operations that need more resources
  const heavyEndpoints = ["/api/timetables/generate", "/api/analytics"];

  if (heavyEndpoints.some((pattern) => endpoint.startsWith(pattern))) {
    return {
      memorySize: LAMBDA_OPTIMIZATIONS.MEMORY_CONFIGS.HEAVY,
      timeout: LAMBDA_OPTIMIZATIONS.TIMEOUT_CONFIGS.EXTENDED,
    };
  }

  // Medium operations
  const mediumEndpoints = ["/api/marketplace", "/api/reviews"];

  if (mediumEndpoints.some((pattern) => endpoint.startsWith(pattern))) {
    return {
      memorySize: LAMBDA_OPTIMIZATIONS.MEMORY_CONFIGS.MEDIUM,
      timeout: LAMBDA_OPTIMIZATIONS.TIMEOUT_CONFIGS.STANDARD,
    };
  }

  // Default to light configuration
  return {
    memorySize: LAMBDA_OPTIMIZATIONS.MEMORY_CONFIGS.LIGHT,
    timeout: LAMBDA_OPTIMIZATIONS.TIMEOUT_CONFIGS.QUICK,
  };
};

/**
 * Evaluate performance metrics and provide recommendations
 * @param {Object} metrics - Performance metrics
 * @returns {Object} Performance evaluation and recommendations
 */
const evaluatePerformance = (metrics) => {
  const { duration, memoryUsed, cpuUsage, errorRate } = metrics;

  const evaluation = {
    overall: "GOOD",
    recommendations: [],
    alerts: [],
  };

  // Evaluate response time
  if (duration > PERFORMANCE_THRESHOLDS.RESPONSE_TIME.POOR) {
    evaluation.overall = "POOR";
    evaluation.alerts.push("Response time exceeds 5 seconds");
    evaluation.recommendations.push("Increase Lambda memory or optimize code");
  } else if (duration > PERFORMANCE_THRESHOLDS.RESPONSE_TIME.ACCEPTABLE) {
    evaluation.overall = "NEEDS_IMPROVEMENT";
    evaluation.recommendations.push("Consider optimizing database queries");
  }

  // Evaluate memory usage
  if (memoryUsed > PERFORMANCE_THRESHOLDS.MEMORY_USAGE.CRITICAL) {
    evaluation.overall = "POOR";
    evaluation.alerts.push("Memory usage is critical");
    evaluation.recommendations.push("Increase Lambda memory allocation");
  } else if (memoryUsed > PERFORMANCE_THRESHOLDS.MEMORY_USAGE.HIGH) {
    evaluation.recommendations.push("Monitor memory usage trends");
  }

  // Evaluate error rate
  if (errorRate > 10) {
    evaluation.overall = "POOR";
    evaluation.alerts.push("High error rate detected");
  } else if (errorRate > 5) {
    evaluation.recommendations.push("Investigate error patterns");
  }

  return evaluation;
};

module.exports = {
  CACHE_CONFIGS,
  ENDPOINT_CACHE_MAP,
  PERFORMANCE_THRESHOLDS,
  LAMBDA_OPTIMIZATIONS,
  API_GATEWAY_OPTIMIZATIONS,
  MONITORING_CONFIG,
  COST_OPTIMIZATIONS,
  getCacheConfig,
  getLambdaConfig,
  evaluatePerformance,
};
