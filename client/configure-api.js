#!/usr/bin/env node

/**
 * API Gateway Configuration Script
 * Updates environment files with actual API Gateway URLs after deployment
 */

const fs = require("fs");
const path = require("path");

// Helper functions
const log = (message) => console.log(`[CONFIG] ${message}`);
const error = (message) => console.error(`[ERROR] ${message}`);

// Update environment file with API Gateway URL
const updateEnvFile = (environment, apiGatewayUrl) => {
  const envFile = `.env.${environment}`;

  if (!fs.existsSync(envFile)) {
    throw new Error(`Environment file not found: ${envFile}`);
  }

  let envContent = fs.readFileSync(envFile, "utf8");

  // Update API URL
  const apiUrlPattern = /REACT_APP_API_URL=.+/;
  const newApiUrl = `REACT_APP_API_URL=${apiGatewayUrl}`;

  if (apiUrlPattern.test(envContent)) {
    envContent = envContent.replace(apiUrlPattern, newApiUrl);
  } else {
    envContent += `\n${newApiUrl}`;
  }

  fs.writeFileSync(envFile, envContent);
  log(`Updated ${envFile} with API Gateway URL: ${apiGatewayUrl}`);
};

// Validate API Gateway URL format
const validateApiGatewayUrl = (url) => {
  const apiGatewayPattern =
    /^https:\/\/[a-z0-9]+\.execute-api\.[a-z0-9-]+\.amazonaws\.com\/[a-z0-9]+$/;
  const customDomainPattern =
    /^https:\/\/[a-z0-9.-]+\.(com|net|org)\/[a-z0-9]+$/;

  if (!apiGatewayPattern.test(url) && !customDomainPattern.test(url)) {
    throw new Error(`Invalid API Gateway URL format: ${url}`);
  }

  return true;
};

// Main execution
const main = () => {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log("Usage: node configure-api.js <environment> <api-gateway-url>");
    console.log(
      "Example: node configure-api.js production https://abc123.execute-api.us-east-1.amazonaws.com/prod"
    );
    process.exit(1);
  }

  const [environment, apiGatewayUrl] = args;

  try {
    log(`Configuring API Gateway URL for ${environment} environment`);

    validateApiGatewayUrl(apiGatewayUrl);
    updateEnvFile(environment, apiGatewayUrl);

    log("API Gateway configuration completed successfully!");
  } catch (err) {
    error(err.message);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { updateEnvFile, validateApiGatewayUrl };
