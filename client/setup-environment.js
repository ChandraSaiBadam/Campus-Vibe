#!/usr/bin/env node

/**
 * Environment Setup Script
 *
 * Sets up environment variables and configuration for different deployment stages.
 * Handles development, staging, and production environments with proper AWS integration.
 *
 * Requirements addressed:
 * - 1.4: Both frontend and backend accessible via HTTPS
 * - 4.1: Frontend loads within 3 seconds globally
 * - 2.4: Environment variable configuration documented
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Helper functions
const log = (message) => console.log(`[SETUP] ${message}`);
const error = (message) => console.error(`[ERROR] ${message}`);
const success = (message) => console.log(`[SUCCESS] ${message}`);
const warn = (message) => console.warn(`[WARN] ${message}`);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

// Environment templates
const ENVIRONMENT_TEMPLATES = {
  development: {
    REACT_APP_API_URL: "http://localhost:5001",
    REACT_APP_ENVIRONMENT: "development",
    REACT_APP_AWS_REGION: "us-east-1",
    REACT_APP_CDN_URL: "",
    REACT_APP_API_STAGE: "dev",
    REACT_APP_API_KEY: "",
    REACT_APP_ENABLE_ANALYTICS: "false",
    REACT_APP_CACHE_TIMEOUT: "60000",
    REACT_APP_PERFORMANCE_MONITORING: "true",
    REACT_APP_ERROR_REPORTING: "true",
    GENERATE_SOURCEMAP: "true",
    INLINE_RUNTIME_CHUNK: "true",
    IMAGE_INLINE_SIZE_LIMIT: "10000",
  },
  staging: {
    REACT_APP_API_URL:
      "https://your-api-gateway-id.execute-api.us-east-1.amazonaws.com/staging",
    REACT_APP_ENVIRONMENT: "staging",
    REACT_APP_AWS_REGION: "us-east-1",
    REACT_APP_CDN_URL: "https://your-cloudfront-distribution.cloudfront.net",
    REACT_APP_API_STAGE: "staging",
    REACT_APP_API_KEY: "",
    REACT_APP_ENABLE_ANALYTICS: "false",
    REACT_APP_CACHE_TIMEOUT: "60000",
    REACT_APP_PERFORMANCE_MONITORING: "true",
    REACT_APP_ERROR_REPORTING: "true",
    GENERATE_SOURCEMAP: "false",
    INLINE_RUNTIME_CHUNK: "false",
    IMAGE_INLINE_SIZE_LIMIT: "0",
  },
  production: {
    REACT_APP_API_URL:
      "https://your-api-gateway-id.execute-api.us-east-1.amazonaws.com/prod",
    REACT_APP_ENVIRONMENT: "production",
    REACT_APP_AWS_REGION: "us-east-1",
    REACT_APP_CDN_URL: "https://your-cloudfront-distribution.cloudfront.net",
    REACT_APP_API_STAGE: "prod",
    REACT_APP_API_KEY: "",
    REACT_APP_ENABLE_ANALYTICS: "true",
    REACT_APP_CACHE_TIMEOUT: "300000",
    REACT_APP_PERFORMANCE_MONITORING: "true",
    REACT_APP_ERROR_REPORTING: "true",
    GENERATE_SOURCEMAP: "false",
    INLINE_RUNTIME_CHUNK: "false",
    IMAGE_INLINE_SIZE_LIMIT: "0",
  },
};

// Generate environment file content
const generateEnvContent = (environment, variables) => {
  const template = ENVIRONMENT_TEMPLATES[environment];
  const mergedVars = { ...template, ...variables };

  let content = `# ${environment.toUpperCase()} environment variables for Campus Vibe Client\n`;
  content += `# Generated on ${new Date().toISOString()}\n\n`;

  // Group variables by category
  const categories = {
    "API Configuration": [
      "REACT_APP_API_URL",
      "REACT_APP_API_STAGE",
      "REACT_APP_API_KEY",
    ],
    "Environment Settings": ["REACT_APP_ENVIRONMENT", "REACT_APP_AWS_REGION"],
    "Performance Settings": [
      "REACT_APP_ENABLE_ANALYTICS",
      "REACT_APP_CACHE_TIMEOUT",
      "REACT_APP_PERFORMANCE_MONITORING",
      "REACT_APP_ERROR_REPORTING",
    ],
    "CDN and Assets": ["REACT_APP_CDN_URL"],
    "Build Optimizations": [
      "GENERATE_SOURCEMAP",
      "INLINE_RUNTIME_CHUNK",
      "IMAGE_INLINE_SIZE_LIMIT",
    ],
  };

  Object.entries(categories).forEach(([category, vars]) => {
    content += `# ${category}\n`;
    vars.forEach((varName) => {
      if (mergedVars[varName] !== undefined) {
        content += `${varName}=${mergedVars[varName]}\n`;
      }
    });
    content += "\n";
  });

  return content;
};

// Interactive setup for environment variables
const interactiveSetup = async (environment) => {
  log(`Setting up ${environment} environment interactively...`);

  const variables = {};

  // API Gateway URL
  if (environment !== "development") {
    const apiUrl = await question(
      `Enter API Gateway URL for ${environment} (or press Enter for placeholder): `
    );
    if (apiUrl.trim()) {
      variables.REACT_APP_API_URL = apiUrl.trim();
    }
  }

  // AWS Region
  const region = await question("Enter AWS region (default: us-east-1): ");
  if (region.trim()) {
    variables.REACT_APP_AWS_REGION = region.trim();
  }

  // CloudFront URL
  if (environment !== "development") {
    const cdnUrl = await question(
      `Enter CloudFront distribution URL for ${environment} (optional): `
    );
    if (cdnUrl.trim()) {
      variables.REACT_APP_CDN_URL = cdnUrl.trim();
    }
  }

  // API Key (if needed)
  const apiKey = await question("Enter API Gateway API Key (optional): ");
  if (apiKey.trim()) {
    variables.REACT_APP_API_KEY = apiKey.trim();
  }

  return variables;
};

// Create environment file
const createEnvironmentFile = (environment, variables = {}) => {
  const envFile = `.env.${environment}`;
  const content = generateEnvContent(environment, variables);

  fs.writeFileSync(envFile, content);
  success(`Created ${envFile}`);

  return envFile;
};

// Validate environment file
const validateEnvironmentFile = (environment) => {
  const envFile = `.env.${environment}`;

  if (!fs.existsSync(envFile)) {
    throw new Error(`Environment file not found: ${envFile}`);
  }

  const content = fs.readFileSync(envFile, "utf8");
  const requiredVars = [
    "REACT_APP_API_URL",
    "REACT_APP_ENVIRONMENT",
    "REACT_APP_AWS_REGION",
  ];

  const missingVars = requiredVars.filter((varName) => {
    return !content.includes(`${varName}=`);
  });

  if (missingVars.length > 0) {
    throw new Error(`Missing required variables: ${missingVars.join(", ")}`);
  }

  // Check for placeholder values
  const placeholders = [
    "your-api-gateway-id",
    "your-cloudfront-distribution",
    "example.com",
  ];

  const hasPlaceholders = placeholders.some((placeholder) =>
    content.includes(placeholder)
  );

  if (hasPlaceholders && environment !== "development") {
    warn(
      `Environment file contains placeholder values that need to be updated`
    );
  }

  success(`Environment file validation passed: ${envFile}`);
  return true;
};

// Setup all environments
const setupAllEnvironments = async (interactive = false) => {
  const environments = ["development", "staging", "production"];

  for (const env of environments) {
    log(`Setting up ${env} environment...`);

    let variables = {};
    if (interactive && env !== "development") {
      variables = await interactiveSetup(env);
    }

    createEnvironmentFile(env, variables);
    validateEnvironmentFile(env);
  }

  success("All environment files created successfully!");
};

// Generate environment documentation
const generateDocumentation = () => {
  const docContent = `# Environment Configuration Guide

This document describes the environment variables used in the Campus Vibe frontend application.

## Environment Files

- \`.env.development\` - Local development environment
- \`.env.staging\` - Staging/testing environment on AWS
- \`.env.production\` - Production environment on AWS

## Environment Variables

### API Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| \`REACT_APP_API_URL\` | Backend API endpoint | \`https://api.example.com\` |
| \`REACT_APP_API_STAGE\` | API Gateway stage | \`prod\`, \`staging\`, \`dev\` |
| \`REACT_APP_API_KEY\` | API Gateway API Key (optional) | \`abc123...\` |

### Environment Settings

| Variable | Description | Example |
|----------|-------------|---------|
| \`REACT_APP_ENVIRONMENT\` | Current environment | \`production\`, \`staging\`, \`development\` |
| \`REACT_APP_AWS_REGION\` | AWS region for services | \`us-east-1\` |

### Performance Settings

| Variable | Description | Default |
|----------|-------------|---------|
| \`REACT_APP_ENABLE_ANALYTICS\` | Enable analytics tracking | \`true\` (prod), \`false\` (dev) |
| \`REACT_APP_CACHE_TIMEOUT\` | API cache timeout (ms) | \`300000\` (5 min) |
| \`REACT_APP_PERFORMANCE_MONITORING\` | Enable performance monitoring | \`true\` |
| \`REACT_APP_ERROR_REPORTING\` | Enable error reporting | \`true\` |

### CDN and Assets

| Variable | Description | Example |
|----------|-------------|---------|
| \`REACT_APP_CDN_URL\` | CloudFront distribution URL | \`https://d123.cloudfront.net\` |

### Build Optimizations

| Variable | Description | Production Value |
|----------|-------------|------------------|
| \`GENERATE_SOURCEMAP\` | Generate source maps | \`false\` |
| \`INLINE_RUNTIME_CHUNK\` | Inline runtime chunk | \`false\` |
| \`IMAGE_INLINE_SIZE_LIMIT\` | Image inline size limit | \`0\` |

## Usage

### Development
\`\`\`bash
npm start
\`\`\`

### Staging Build
\`\`\`bash
npm run build:staging
\`\`\`

### Production Build
\`\`\`bash
npm run build:production
\`\`\`

### AWS Deployment Build
\`\`\`bash
npm run build:aws:production
\`\`\`

## Configuration Scripts

- \`npm run configure:api:auto\` - Auto-configure API URL from deployment
- \`npm run configure:api:production\` - Configure for production
- \`npm run validate:config\` - Validate configuration

## Security Notes

- Never commit API keys or sensitive data to version control
- Use placeholder values in committed environment files
- Update placeholders with actual values during deployment
- Enable HTTPS for all production API endpoints

## Troubleshooting

### Common Issues

1. **API URL not working**: Ensure the URL is correct and accessible
2. **CORS errors**: Check API Gateway CORS configuration
3. **Build failures**: Verify all required environment variables are set
4. **Performance issues**: Check cache timeout and CDN configuration

### Validation

Run the validation script to check your configuration:

\`\`\`bash
npm run validate:config production
\`\`\`
`;

  fs.writeFileSync("ENVIRONMENT_CONFIG.md", docContent);
  success(
    "Environment configuration documentation generated: ENVIRONMENT_CONFIG.md"
  );
};

// Main execution
const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0];
  const environment = args[1];

  try {
    switch (command) {
      case "init":
        log("Initializing environment configuration...");
        await setupAllEnvironments(false);
        generateDocumentation();
        break;

      case "interactive":
        log("Starting interactive environment setup...");
        await setupAllEnvironments(true);
        generateDocumentation();
        break;

      case "create":
        if (!environment) {
          throw new Error(
            "Environment name required. Usage: create <environment>"
          );
        }
        createEnvironmentFile(environment);
        validateEnvironmentFile(environment);
        break;

      case "validate":
        if (!environment) {
          throw new Error(
            "Environment name required. Usage: validate <environment>"
          );
        }
        validateEnvironmentFile(environment);
        break;

      case "docs":
        generateDocumentation();
        break;

      default:
        console.log(`
Usage: node setup-environment.js <command> [environment]

Commands:
  init         Create all environment files with default values
  interactive  Create environment files with interactive prompts
  create       Create specific environment file
  validate     Validate specific environment file
  docs         Generate environment documentation

Examples:
  node setup-environment.js init
  node setup-environment.js interactive
  node setup-environment.js create production
  node setup-environment.js validate staging
  node setup-environment.js docs
`);
        break;
    }
  } catch (err) {
    error(err.message);
    process.exit(1);
  } finally {
    rl.close();
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  createEnvironmentFile,
  validateEnvironmentFile,
  setupAllEnvironments,
  generateDocumentation,
};
