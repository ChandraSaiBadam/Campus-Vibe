import axios from "axios";

// Environment configuration
const ENVIRONMENT = process.env.REACT_APP_ENVIRONMENT || "development";
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5001";
const CACHE_TIMEOUT = parseInt(process.env.REACT_APP_CACHE_TIMEOUT) || 60000;
const AWS_REGION = process.env.REACT_APP_AWS_REGION || "us-east-1";
const CDN_URL = process.env.REACT_APP_CDN_URL || "";
const API_STAGE = process.env.REACT_APP_API_STAGE || "dev";
const API_KEY = process.env.REACT_APP_API_KEY || "";
const PERFORMANCE_MONITORING =
  process.env.REACT_APP_PERFORMANCE_MONITORING === "true";
const ERROR_REPORTING = process.env.REACT_APP_ERROR_REPORTING === "true";

// API Gateway specific configuration
const isApiGateway =
  API_BASE_URL.includes("amazonaws.com") ||
  API_BASE_URL.includes("execute-api");
const apiGatewayStage = isApiGateway
  ? API_BASE_URL.includes("/prod")
    ? "prod"
    : API_BASE_URL.includes("/staging")
    ? "staging"
    : "dev"
  : null;

// Environment-specific configurations
const ENV_CONFIG = {
  development: {
    timeout: 10000,
    retries: 1,
    enableLogging: true,
    enableCaching: false,
    apiGateway: false,
  },
  staging: {
    timeout: 15000,
    retries: 2,
    enableLogging: true,
    enableCaching: true,
    apiGateway: isApiGateway,
  },
  production: {
    timeout: 20000,
    retries: 3,
    enableLogging: false,
    enableCaching: true,
    apiGateway: isApiGateway,
  },
};

const currentConfig = ENV_CONFIG[ENVIRONMENT] || ENV_CONFIG.development;

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: currentConfig.timeout,
  headers: {
    "Content-Type": "application/json",
    "User-Agent": `CampusVibe-Frontend/${ENVIRONMENT}`,
    ...(currentConfig.apiGateway &&
      API_KEY && {
        "X-API-Key": API_KEY,
      }),
    ...(PERFORMANCE_MONITORING && {
      "X-Performance-Monitoring": "enabled",
    }),
  },
});

// Request interceptor for adding auth tokens if needed
api.interceptors.request.use(
  (config) => {
    // Add any auth tokens here if needed in the future
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle common errors
    if (error.response?.status === 401) {
      // Handle unauthorized access
      if (currentConfig.enableLogging) {
        console.warn("Unauthorized access detected");
      }
    } else if (error.response?.status >= 500) {
      // Handle server errors with retry logic
      if (currentConfig.enableLogging) {
        console.error("Server error occurred:", error.response.status);
      }

      // Retry logic for production/staging environments
      if (
        !originalRequest._retry &&
        originalRequest._retryCount < currentConfig.retries
      ) {
        originalRequest._retry = true;
        originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

        // Exponential backoff
        const delay = Math.pow(2, originalRequest._retryCount) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        return api(originalRequest);
      }
    } else if (error.code === "ECONNABORTED") {
      // Handle timeout errors
      if (currentConfig.enableLogging) {
        console.warn("Request timeout occurred");
      }
    }

    return Promise.reject(error);
  }
);

// API endpoints configuration
export const API_ENDPOINTS = {
  // Forum endpoints
  FORUM: {
    QUESTIONS: "/api/forum/questions",
    CATEGORIES: "/api/forum/categories",
    TAGS_TRENDING: "/api/forum/tags/trending",
    VOTE: "/api/forum/vote",
    COMMENTS: "/api/forum/comments",
  },
  // Marketplace endpoints
  MARKETPLACE: {
    ITEMS: "/api/marketplace",
    CATEGORIES: "/api/marketplace/categories",
  },
  // Reviews endpoints
  REVIEWS: {
    BASE: "/api/reviews",
    FACULTY: "/api/reviews/faculty",
  },
  // Upload endpoints
  UPLOAD: {
    IMAGE: "/api/upload/image",
  },
};

// Helper function to build full URL for fetch calls
export const buildApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};

// Environment utility functions
export const getEnvironment = () => ENVIRONMENT;
export const isProduction = () => ENVIRONMENT === "production";
export const isDevelopment = () => ENVIRONMENT === "development";
export const isStaging = () => ENVIRONMENT === "staging";
export const isApiGatewayDeployment = () => isApiGateway;
export const getApiGatewayStage = () => apiGatewayStage;

// Configuration getters
export const getApiBaseUrl = () => API_BASE_URL;
export const getCacheTimeout = () => CACHE_TIMEOUT;
export const getConfig = () => currentConfig;
export const getAwsRegion = () => AWS_REGION;
export const getCdnUrl = () => CDN_URL;
export const getApiStage = () => API_STAGE;
export const getApiKey = () => API_KEY;
export const isPerformanceMonitoringEnabled = () => PERFORMANCE_MONITORING;
export const isErrorReportingEnabled = () => ERROR_REPORTING;

// Health check function for deployment validation
export const healthCheck = async () => {
  try {
    const start = performance.now();
    const response = await api.get("/api/health");
    const end = performance.now();
    const responseTime = Math.round(end - start);

    return {
      status: "healthy",
      environment: ENVIRONMENT,
      apiUrl: API_BASE_URL,
      apiStage: API_STAGE,
      responseTime,
      timestamp: new Date().toISOString(),
      config: {
        timeout: currentConfig.timeout,
        retries: currentConfig.retries,
        caching: currentConfig.enableCaching,
        apiGateway: currentConfig.apiGateway,
      },
      ...response.data,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      environment: ENVIRONMENT,
      apiUrl: API_BASE_URL,
      apiStage: API_STAGE,
      timestamp: new Date().toISOString(),
      error: error.message,
      config: {
        timeout: currentConfig.timeout,
        retries: currentConfig.retries,
        caching: currentConfig.enableCaching,
        apiGateway: currentConfig.apiGateway,
      },
    };
  }
};

// Performance monitoring function
export const trackPerformance = (action, duration, metadata = {}) => {
  if (!PERFORMANCE_MONITORING) return;

  const performanceData = {
    action,
    duration,
    timestamp: new Date().toISOString(),
    environment: ENVIRONMENT,
    apiUrl: API_BASE_URL,
    ...metadata,
  };

  // Log performance data (in production, this could be sent to analytics)
  if (isDevelopment()) {
    console.log("Performance:", performanceData);
  }

  return performanceData;
};

// Error reporting function
export const reportError = (error, context = {}) => {
  if (!ERROR_REPORTING) return;

  const errorData = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    environment: ENVIRONMENT,
    apiUrl: API_BASE_URL,
    context,
  };

  // Log error data (in production, this could be sent to error tracking service)
  if (isDevelopment()) {
    console.error("Error Report:", errorData);
  }

  return errorData;
};

export default api;
