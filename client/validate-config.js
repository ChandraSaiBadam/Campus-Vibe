#!/usr/bin/env node

/**
 * Configuration Validation Script
 * Validates that the frontend is properly configured for AWS deployment
 */

const fs = require("fs");
const path = require("path");

// Helper functions
const log = (message) => console.log(`[VALIDATE] ${message}`);
const error = (message) => console.error(`[ERROR] ${message}`);
const warn = (message) => console.warn(`[WARN] ${message}`);
const success = (message) => console.log(`[SUCCESS] ${message}`);

// Validate environment file
const validateEnvFile = (environment) => {
  const envFile = `.env.${environment}`;

  if (!fs.existsSync(envFile)) {
    throw new Error(`Environment file not found: ${envFile}`);
  }

  const envContent = fs.readFileSync(envFile, "utf8");
  const requiredVars = [
    "REACT_APP_API_URL",
    "REACT_APP_ENVIRONMENT",
    "REACT_APP_AWS_REGION",
  ];

  const missingVars = [];
  const configuredVars = {};

  requiredVars.forEach((varName) => {
    const match = envContent.match(new RegExp(`${varName}=(.+)`));
    if (match) {
      configuredVars[varName] = match[1].trim();
    } else {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    throw new Error(
      `Missing variables in ${envFile}: ${missingVars.join(", ")}`
    );
  }

  // Validate API URL format
  const apiUrl = configuredVars.REACT_APP_API_URL;
  if (environment !== "development" && !apiUrl.startsWith("https://")) {
    throw new Error(`API URL must use HTTPS for ${environment} environment`);
  }

  // Check for placeholder URLs
  if (
    apiUrl.includes("your-api-gateway-url") ||
    apiUrl.includes("example.com")
  ) {
    warn(`API URL appears to be a placeholder in ${envFile}: ${apiUrl}`);
  }

  return {
    file: envFile,
    variables: configuredVars,
    valid: true,
  };
};

// Validate build configuration
const validateBuildConfig = () => {
  const packageJsonPath = "package.json";

  if (!fs.existsSync(packageJsonPath)) {
    throw new Error("package.json not found");
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const scripts = packageJson.scripts || {};

  const requiredScripts = [
    "build:staging",
    "build:production",
    "build:aws:staging",
    "build:aws:production",
  ];

  const missingScripts = requiredScripts.filter((script) => !scripts[script]);

  if (missingScripts.length > 0) {
    throw new Error(`Missing build scripts: ${missingScripts.join(", ")}`);
  }

  return {
    scripts: requiredScripts.map((script) => ({
      name: script,
      command: scripts[script],
    })),
    valid: true,
  };
};

// Validate API configuration
const validateApiConfig = () => {
  const apiConfigPath = "src/config/api.js";

  if (!fs.existsSync(apiConfigPath)) {
    throw new Error("API configuration file not found: src/config/api.js");
  }

  const apiConfig = fs.readFileSync(apiConfigPath, "utf8");

  // Check for required exports
  const requiredExports = [
    "getEnvironment",
    "isProduction",
    "isDevelopment",
    "isStaging",
    "getApiBaseUrl",
    "healthCheck",
  ];

  const missingExports = requiredExports.filter(
    (exportName) =>
      !apiConfig.includes(`export const ${exportName}`) &&
      !apiConfig.includes(`export { ${exportName}`)
  );

  if (missingExports.length > 0) {
    throw new Error(`Missing API config exports: ${missingExports.join(", ")}`);
  }

  return {
    file: apiConfigPath,
    exports: requiredExports,
    valid: true,
  };
};

// Main validation
const validateConfiguration = (environment) => {
  const results = {
    environment,
    timestamp: new Date().toISOString(),
    validations: [],
  };

  try {
    log(`Validating configuration for ${environment} environment`);

    // Validate environment file
    const envValidation = validateEnvFile(environment);
    results.validations.push({
      type: "environment",
      ...envValidation,
    });
    success(`Environment file validation passed: ${envValidation.file}`);

    // Validate build configuration
    const buildValidation = validateBuildConfig();
    results.validations.push({
      type: "build",
      ...buildValidation,
    });
    success("Build configuration validation passed");

    // Validate API configuration
    const apiValidation = validateApiConfig();
    results.validations.push({
      type: "api",
      ...apiValidation,
    });
    success("API configuration validation passed");

    results.valid = true;
    success(`All validations passed for ${environment} environment`);
  } catch (err) {
    results.valid = false;
    results.error = err.message;
    error(`Validation failed: ${err.message}`);
  }

  return results;
};

// Main execution
const main = () => {
  const environment = process.argv[2] || "production";

  try {
    const results = validateConfiguration(environment);

    // Write validation results
    const resultsFile = `validation-results-${environment}.json`;
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));

    if (results.valid) {
      success(`Configuration validation completed successfully!`);
      success(`Results saved to: ${resultsFile}`);
      process.exit(0);
    } else {
      error("Configuration validation failed!");
      process.exit(1);
    }
  } catch (err) {
    error(err.message);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  validateConfiguration,
  validateEnvFile,
  validateBuildConfig,
  validateApiConfig,
};
