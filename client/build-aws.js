#!/usr/bin/env node

/**
 * AWS Deployment Build Script
 * Handles building the React app for different AWS deployment stages
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Configuration
const ENVIRONMENTS = ["development", "staging", "production"];
const BUILD_DIR = "build";

// Helper functions
const log = (message) => console.log(`[BUILD] ${message}`);
const error = (message) => console.error(`[ERROR] ${message}`);

// Validate environment
const validateEnvironment = (env) => {
  if (!ENVIRONMENTS.includes(env)) {
    throw new Error(
      `Invalid environment: ${env}. Must be one of: ${ENVIRONMENTS.join(", ")}`
    );
  }
};

// Clean build directory
const cleanBuild = () => {
  if (fs.existsSync(BUILD_DIR)) {
    log("Cleaning existing build directory...");
    execSync(`rm -rf ${BUILD_DIR}`, { stdio: "inherit" });
  }
};

// Validate environment variables
const validateEnvVars = (env) => {
  const envFile = `.env.${env}`;
  if (!fs.existsSync(envFile)) {
    throw new Error(`Environment file not found: ${envFile}`);
  }

  log(`Using environment file: ${envFile}`);

  // Load and validate required variables
  const envContent = fs.readFileSync(envFile, "utf8");
  const requiredVars = ["REACT_APP_API_URL", "REACT_APP_ENVIRONMENT"];
  const awsVars = ["REACT_APP_AWS_REGION"];

  for (const varName of requiredVars) {
    if (!envContent.includes(varName)) {
      throw new Error(`Missing required variable ${varName} in ${envFile}`);
    }
  }

  // Validate AWS-specific variables for staging/production
  if (env === "staging" || env === "production") {
    for (const varName of awsVars) {
      if (!envContent.includes(varName)) {
        log(`Warning: Missing AWS variable ${varName} in ${envFile}`);
      }
    }

    // Validate API URL format
    const apiUrlMatch = envContent.match(/REACT_APP_API_URL=(.+)/);
    if (apiUrlMatch) {
      const apiUrl = apiUrlMatch[1].trim();
      if (!apiUrl.startsWith("https://")) {
        throw new Error(`API URL must use HTTPS for ${env} environment`);
      }
      log(`API URL configured: ${apiUrl}`);
    }
  }
};

// Build for specific environment
const buildForEnvironment = (env) => {
  log(`Building for environment: ${env}`);

  try {
    // Load environment variables from .env file
    const envFile = `.env.${env}`;
    const envVars = {};

    if (fs.existsSync(envFile)) {
      const envContent = fs.readFileSync(envFile, "utf8");
      envContent.split("\n").forEach((line) => {
        const [key, ...valueParts] = line.split("=");
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join("=").trim();
        }
      });
    }

    // Set environment and build with optimizations
    const buildCommand = "react-scripts build";

    execSync(buildCommand, {
      stdio: "inherit",
      env: {
        ...process.env,
        ...envVars,
        NODE_ENV: "production",
        REACT_APP_ENVIRONMENT: env,
        // Performance optimizations
        GENERATE_SOURCEMAP: "false",
        INLINE_RUNTIME_CHUNK: "false",
        IMAGE_INLINE_SIZE_LIMIT: "0", // Don't inline images for better caching
      },
    });

    log(`Build completed successfully for ${env}`);

    // Run optimization script
    log("Running build optimizations...");
    execSync("node optimize-build.js", { stdio: "inherit" });

    // Generate build info with performance metrics
    const buildInfo = {
      environment: env,
      timestamp: new Date().toISOString(),
      version: require("./package.json").version,
      nodeVersion: process.version,
      buildHash: Math.random().toString(36).substring(7),
      optimizations: {
        sourceMaps: false,
        inlineRuntime: false,
        imageInlining: false,
        compressionEnabled: true,
        serviceWorkerGenerated: true,
      },
      performance: {
        targetLoadTime: "< 3 seconds",
        cacheStrategy: "aggressive",
        compressionEnabled: true,
      },
    };

    fs.writeFileSync(
      path.join(BUILD_DIR, "build-info.json"),
      JSON.stringify(buildInfo, null, 2)
    );

    log("Build info and optimizations completed");
  } catch (err) {
    error(`Build failed: ${err.message}`);
    process.exit(1);
  }
};

// Optimize build for AWS
const optimizeBuild = () => {
  log("Optimizing build for AWS deployment...");

  const buildPath = path.join(__dirname, BUILD_DIR);

  // Create .htaccess for S3 redirects (if needed)
  const htaccess = `
# Enable GZIP compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>

# Handle React Router
RewriteEngine On
RewriteBase /
RewriteRule ^index\\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
`;

  fs.writeFileSync(path.join(buildPath, ".htaccess"), htaccess.trim());

  log("AWS optimization completed");
};

// Main execution
const main = () => {
  const env = process.argv[2] || "production";

  try {
    log(`Starting AWS build process for ${env} environment`);

    validateEnvironment(env);
    validateEnvVars(env);
    cleanBuild();
    buildForEnvironment(env);
    optimizeBuild();

    log("AWS build process completed successfully!");
    log(`Build output available in: ${BUILD_DIR}/`);
  } catch (err) {
    error(err.message);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { buildForEnvironment, validateEnvironment, optimizeBuild };
