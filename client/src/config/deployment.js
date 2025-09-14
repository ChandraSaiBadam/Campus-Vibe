// Deployment configuration for AWS environments

export const DEPLOYMENT_CONFIG = {
  // AWS regions configuration
  AWS_REGIONS: {
    primary: "us-east-1",
    secondary: "us-west-2",
  },

  // CloudFront configuration
  CLOUDFRONT: {
    cachePolicies: {
      static: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad", // Managed-CachingOptimized
      api: "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf", // Managed-CachingDisabled
    },
    compressionFormats: ["gzip", "br"],
  },

  // S3 configuration
  S3: {
    bucketNaming: {
      production: "campus-vibe-frontend-prod",
      staging: "campus-vibe-frontend-staging",
    },
    cacheControl: {
      html: "no-cache, no-store, must-revalidate",
      static: "public, max-age=31536000, immutable",
      assets: "public, max-age=86400",
    },
  },

  // Build optimization settings
  BUILD: {
    chunkSizeWarningLimit: 500000, // 500KB
    enableTreeShaking: true,
    enableMinification: true,
    enableGzip: true,
  },

  // Performance monitoring
  PERFORMANCE: {
    enableWebVitals: true,
    enableErrorBoundary: true,
    enableServiceWorker: false, // Disabled for simplicity
  },
};

// Environment-specific deployment settings
export const getDeploymentConfig = (environment = "production") => {
  const baseConfig = {
    ...DEPLOYMENT_CONFIG,
    environment,
  };

  switch (environment) {
    case "production":
      return {
        ...baseConfig,
        bucketName: DEPLOYMENT_CONFIG.S3.bucketNaming.production,
        enableAnalytics: true,
        enableErrorReporting: true,
        logLevel: "error",
      };

    case "staging":
      return {
        ...baseConfig,
        bucketName: DEPLOYMENT_CONFIG.S3.bucketNaming.staging,
        enableAnalytics: false,
        enableErrorReporting: true,
        logLevel: "warn",
      };

    case "development":
    default:
      return {
        ...baseConfig,
        bucketName: "campus-vibe-frontend-dev",
        enableAnalytics: false,
        enableErrorReporting: false,
        logLevel: "debug",
      };
  }
};

// Validation function for deployment readiness
export const validateDeploymentConfig = () => {
  const requiredEnvVars = ["REACT_APP_API_URL", "REACT_APP_ENVIRONMENT"];
  const awsEnvVars = ["REACT_APP_AWS_REGION"];

  const missing = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  // Validate API URL format
  const apiUrl = process.env.REACT_APP_API_URL;
  if (!apiUrl.startsWith("http://") && !apiUrl.startsWith("https://")) {
    throw new Error("REACT_APP_API_URL must be a valid HTTP/HTTPS URL");
  }

  // Validate AWS-specific variables for production/staging
  const environment = process.env.REACT_APP_ENVIRONMENT;
  if (environment === "production" || environment === "staging") {
    const missingAws = awsEnvVars.filter((varName) => !process.env[varName]);
    if (missingAws.length > 0) {
      console.warn(
        `Missing AWS environment variables: ${missingAws.join(", ")}`
      );
    }

    // Validate API Gateway URL format for AWS deployments
    if (apiUrl.includes("amazonaws.com") || apiUrl.includes("execute-api")) {
      const apiGatewayPattern =
        /^https:\/\/[a-z0-9]+\.execute-api\.[a-z0-9-]+\.amazonaws\.com\/[a-z0-9]+$/;
      const customDomainPattern =
        /^https:\/\/[a-z0-9.-]+\.(com|net|org)\/[a-z0-9]+$/;

      if (
        !apiGatewayPattern.test(apiUrl) &&
        !customDomainPattern.test(apiUrl)
      ) {
        console.warn(
          "API URL format may not be correct for API Gateway deployment"
        );
      }
    }
  }

  return true;
};

// Get deployment-specific API configuration
export const getApiConfig = () => {
  const environment = process.env.REACT_APP_ENVIRONMENT || "development";
  const apiUrl = process.env.REACT_APP_API_URL;

  return {
    environment,
    apiUrl,
    isApiGateway:
      apiUrl?.includes("amazonaws.com") || apiUrl?.includes("execute-api"),
    stage: apiUrl?.includes("/prod")
      ? "prod"
      : apiUrl?.includes("/staging")
      ? "staging"
      : "dev",
    region: process.env.REACT_APP_AWS_REGION || "us-east-1",
    cdnUrl: process.env.REACT_APP_CDN_URL,
  };
};
