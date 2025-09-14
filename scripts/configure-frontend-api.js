#!/usr/bin/env node

/**
 * Frontend API Configuration Script
 *
 * Automatically configures the frontend to use the deployed API Gateway URL
 * after backend deployment is complete.
 *
 * Requirements addressed:
 * - 1.4: Both frontend and backend accessible via HTTPS
 * - 4.1: Frontend loads within 3 seconds globally
 * - 4.2: API calls respond within 2 seconds
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Helper functions
const log = (message) => console.log(`[CONFIG] ${message}`);
const error = (message) => console.error(`[ERROR] ${message}`);
const success = (message) => console.log(`[SUCCESS] ${message}`);

// Get API Gateway URL from serverless deployment
const getApiGatewayUrl = () => {
  try {
    log("Retrieving API Gateway URL from serverless deployment...");

    // Try to get the URL from serverless info
    const serverlessInfo = execSync("serverless info --verbose", {
      cwd: path.join(__dirname, ".."),
      encoding: "utf8",
    });

    // Parse the API Gateway URL from serverless output
    const urlMatch = serverlessInfo.match(
      /ServiceEndpoint:\s*(https:\/\/[^\s]+)/
    );

    if (urlMatch) {
      const apiUrl = urlMatch[1];
      log(`Found API Gateway URL: ${apiUrl}`);
      return apiUrl;
    }

    // Alternative: try to get from .serverless directory
    const serverlessDir = path.join(__dirname, "..", ".serverless");
    if (fs.existsSync(serverlessDir)) {
      const stackOutputPath = path.join(serverlessDir, "stack-output.json");
      if (fs.existsSync(stackOutputPath)) {
        const stackOutput = JSON.parse(
          fs.readFileSync(stackOutputPath, "utf8")
        );
        if (stackOutput.ServiceEndpoint) {
          return stackOutput.ServiceEndpoint;
        }
      }
    }

    throw new Error("Could not find API Gateway URL in serverless deployment");
  } catch (err) {
    throw new Error(`Failed to retrieve API Gateway URL: ${err.message}`);
  }
};

// Update environment file with API Gateway URL
const updateEnvironmentFile = (environment, apiGatewayUrl) => {
  const envFile = path.join(__dirname, "..", "client", `.env.${environment}`);

  if (!fs.existsSync(envFile)) {
    throw new Error(`Environment file not found: ${envFile}`);
  }

  let envContent = fs.readFileSync(envFile, "utf8");

  // Update API URL
  const apiUrlPattern = /REACT_APP_API_URL=.*/;
  const newApiUrl = `REACT_APP_API_URL=${apiGatewayUrl}`;

  if (apiUrlPattern.test(envContent)) {
    envContent = envContent.replace(apiUrlPattern, newApiUrl);
  } else {
    envContent += `\n${newApiUrl}`;
  }

  // Update timestamp for tracking
  const timestampPattern = /# Updated: .*/;
  const timestamp = `# Updated: ${new Date().toISOString()}`;

  if (timestampPattern.test(envContent)) {
    envContent = envContent.replace(timestampPattern, timestamp);
  } else {
    envContent += `\n${timestamp}`;
  }

  fs.writeFileSync(envFile, envContent);
  success(`Updated ${envFile} with API Gateway URL`);
};

// Validate API Gateway URL
const validateApiGatewayUrl = async (url) => {
  try {
    log(`Validating API Gateway URL: ${url}`);

    const axios = require("axios");
    const response = await axios.get(`${url}/api/health`, {
      timeout: 10000,
      headers: {
        "User-Agent": "FrontendConfigScript/1.0",
      },
    });

    if (response.status === 200 && response.data.status === "OK") {
      success("API Gateway URL validation successful");
      return true;
    } else {
      throw new Error(`API returned unexpected response: ${response.status}`);
    }
  } catch (err) {
    error(`API Gateway URL validation failed: ${err.message}`);
    return false;
  }
};

// Update API configuration file
const updateApiConfig = (apiGatewayUrl) => {
  const apiConfigPath = path.join(
    __dirname,
    "..",
    "client",
    "src",
    "config",
    "api.js"
  );

  if (!fs.existsSync(apiConfigPath)) {
    throw new Error(`API config file not found: ${apiConfigPath}`);
  }

  let configContent = fs.readFileSync(apiConfigPath, "utf8");

  // Add deployment timestamp comment
  const deploymentComment = `
// API Gateway URL configured automatically on ${new Date().toISOString()}
// Deployment URL: ${apiGatewayUrl}
`;

  // Insert comment at the top after imports
  const importEndPattern = /import.*from.*["'];?\s*\n\s*\n/;
  if (importEndPattern.test(configContent)) {
    configContent = configContent.replace(
      importEndPattern,
      (match) => match + deploymentComment
    );
  } else {
    configContent = deploymentComment + configContent;
  }

  fs.writeFileSync(apiConfigPath, configContent);
  success("Updated API configuration file with deployment info");
};

// Test frontend configuration
const testFrontendConfig = async (environment) => {
  try {
    log("Testing frontend configuration...");

    const clientDir = path.join(__dirname, "..", "client");

    // Run configuration validation
    execSync(`npm run validate:config ${environment}`, {
      cwd: clientDir,
      stdio: "inherit",
    });

    success("Frontend configuration test passed");
    return true;
  } catch (err) {
    error(`Frontend configuration test failed: ${err.message}`);
    return false;
  }
};

// Generate configuration report
const generateConfigReport = (environment, apiGatewayUrl) => {
  const report = {
    timestamp: new Date().toISOString(),
    environment,
    apiGatewayUrl,
    configuration: {
      environmentFile: `.env.${environment}`,
      apiConfigFile: "src/config/api.js",
      deploymentInfoComponent: "src/components/DeploymentInfo.js",
    },
    validation: {
      apiUrlFormat:
        /^https:\/\/[a-z0-9]+\.execute-api\.[a-z0-9-]+\.amazonaws\.com\/[a-z0-9]+$/.test(
          apiGatewayUrl
        ),
      httpsEnabled: apiGatewayUrl.startsWith("https://"),
      environmentMatches:
        environment === "production" || environment === "staging",
    },
    nextSteps: [
      "Build frontend for production: npm run build:aws:production",
      "Deploy to S3 and CloudFront: npm run deploy:production",
      "Test deployment: npm run test:deployment",
    ],
  };

  const reportPath = path.join(
    __dirname,
    "..",
    `frontend-config-report-${environment}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  success(`Configuration report generated: ${reportPath}`);
  return report;
};

// Main execution
const main = async () => {
  const args = process.argv.slice(2);
  const environment = args[0] || "production";
  let apiGatewayUrl = args[1];

  try {
    log(`Configuring frontend for ${environment} environment`);

    // Get API Gateway URL if not provided
    if (!apiGatewayUrl) {
      apiGatewayUrl = getApiGatewayUrl();
    }

    // Validate the URL format
    const apiGatewayPattern =
      /^https:\/\/[a-z0-9]+\.execute-api\.[a-z0-9-]+\.amazonaws\.com\/[a-z0-9]+$/;
    if (!apiGatewayPattern.test(apiGatewayUrl)) {
      throw new Error(`Invalid API Gateway URL format: ${apiGatewayUrl}`);
    }

    // Update environment file
    updateEnvironmentFile(environment, apiGatewayUrl);

    // Update API configuration
    updateApiConfig(apiGatewayUrl);

    // Validate API Gateway URL
    const isValid = await validateApiGatewayUrl(apiGatewayUrl);
    if (!isValid) {
      error("API Gateway validation failed, but configuration was updated");
    }

    // Test frontend configuration
    await testFrontendConfig(environment);

    // Generate configuration report
    const report = generateConfigReport(environment, apiGatewayUrl);

    success("Frontend API configuration completed successfully!");
    log("Next steps:");
    report.nextSteps.forEach((step, index) => {
      log(`  ${index + 1}. ${step}`);
    });
  } catch (err) {
    error(`Configuration failed: ${err.message}`);
    process.exit(1);
  }
};

// CLI usage help
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
Usage: node configure-frontend-api.js [environment] [api-gateway-url]

Arguments:
  environment      Target environment (default: production)
  api-gateway-url  API Gateway URL (auto-detected if not provided)

Examples:
  node configure-frontend-api.js production
  node configure-frontend-api.js staging https://abc123.execute-api.us-east-1.amazonaws.com/staging

The script will:
1. Retrieve API Gateway URL from serverless deployment
2. Update environment files with the correct API URL
3. Validate the API Gateway endpoint
4. Test the frontend configuration
5. Generate a configuration report
`);
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  getApiGatewayUrl,
  updateEnvironmentFile,
  validateApiGatewayUrl,
  updateApiConfig,
  testFrontendConfig,
  generateConfigReport,
};
