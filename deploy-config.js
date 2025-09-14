#!/usr/bin/env node

/**
 * AWS Deployment Configuration Validator
 * Validates environment variables and AWS configuration before deployment
 */

const fs = require("fs");
const path = require("path");

// Required environment variables for production deployment
const REQUIRED_ENV_VARS = [
  "NODE_ENV",
  "MONGODB_URI",
  "JWT_SECRET",
  "ADMIN_SECRET",
  "EMAIL_USER",
  "EMAIL_PASS",
  "EMAIL_SERVICE",
  "FRONTEND_URL",
];

// Optional environment variables with defaults
const OPTIONAL_ENV_VARS = {
  MAX_FILE_SIZE: "10485760",
  AWS_REGION: "us-east-1",
  ALERT_EMAIL: "admin@example.com",
};

/**
 * Load environment variables from .env.production file
 */
function loadProductionEnv() {
  const envPath = path.join(__dirname, ".env.production");

  if (!fs.existsSync(envPath)) {
    console.error("❌ .env.production file not found");
    console.log(
      "Please create .env.production with required environment variables"
    );
    process.exit(1);
  }

  // Load environment variables
  require("dotenv").config({ path: envPath });
  console.log("✅ Loaded .env.production file");
}

/**
 * Validate required environment variables
 */
function validateEnvironmentVariables() {
  console.log("\n🔍 Validating environment variables...");

  const missing = [];
  const warnings = [];

  // Check required variables
  REQUIRED_ENV_VARS.forEach((varName) => {
    if (!process.env[varName]) {
      missing.push(varName);
    } else {
      console.log(`✅ ${varName}: Set`);
    }
  });

  // Check optional variables and set defaults
  Object.entries(OPTIONAL_ENV_VARS).forEach(([varName, defaultValue]) => {
    if (!process.env[varName]) {
      process.env[varName] = defaultValue;
      warnings.push(`${varName} not set, using default: ${defaultValue}`);
    } else {
      console.log(`✅ ${varName}: Set`);
    }
  });

  // Report warnings
  if (warnings.length > 0) {
    console.log("\n⚠️  Warnings:");
    warnings.forEach((warning) => console.log(`   ${warning}`));
  }

  // Report missing variables
  if (missing.length > 0) {
    console.error("\n❌ Missing required environment variables:");
    missing.forEach((varName) => console.error(`   ${varName}`));
    console.error("\nPlease set these variables in .env.production file");
    process.exit(1);
  }

  console.log("\n✅ All required environment variables are set");
}

/**
 * Validate AWS configuration
 */
function validateAWSConfiguration() {
  console.log("\n🔍 Validating AWS configuration...");

  // Check if AWS CLI is configured
  const { execSync } = require("child_process");

  try {
    execSync("aws sts get-caller-identity", { stdio: "pipe" });
    console.log("✅ AWS credentials are configured");
  } catch (error) {
    console.error("❌ AWS credentials not configured");
    console.log("Please run: aws configure");
    console.log(
      "Or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables"
    );
    process.exit(1);
  }

  // Validate region
  const region = process.env.AWS_REGION || "us-east-1";
  console.log(`✅ AWS Region: ${region}`);
}

/**
 * Validate serverless configuration
 */
function validateServerlessConfiguration() {
  console.log("\n🔍 Validating serverless configuration...");

  const serverlessPath = path.join(__dirname, "serverless.yml");

  if (!fs.existsSync(serverlessPath)) {
    console.error("❌ serverless.yml not found");
    process.exit(1);
  }

  console.log("✅ serverless.yml found");

  // Check if serverless is installed
  try {
    const { execSync } = require("child_process");
    execSync("npx serverless --version", { stdio: "pipe" });
    console.log("✅ Serverless Framework is available");
  } catch (error) {
    console.error("❌ Serverless Framework not found");
    console.log("Please install: npm install -g serverless");
    process.exit(1);
  }
}

/**
 * Generate deployment summary
 */
function generateDeploymentSummary() {
  console.log("\n📋 Deployment Summary:");
  console.log("=".repeat(50));
  console.log(`Service: campus-vibe-server`);
  console.log(`Stage: ${process.env.NODE_ENV || "production"}`);
  console.log(`Region: ${process.env.AWS_REGION || "us-east-1"}`);
  console.log(`Runtime: nodejs18.x (ARM64)`);
  console.log(`Memory: 256MB`);
  console.log(`Timeout: 15s`);
  console.log(`Reserved Concurrency: 100`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log("=".repeat(50));
}

/**
 * Main validation function
 */
function main() {
  console.log("🚀 AWS Deployment Configuration Validator");
  console.log("==========================================");

  try {
    loadProductionEnv();
    validateEnvironmentVariables();
    validateAWSConfiguration();
    validateServerlessConfiguration();
    generateDeploymentSummary();

    console.log("\n✅ All validations passed! Ready for deployment.");
    console.log("\nNext steps:");
    console.log("1. Run: npm run deploy:lambda");
    console.log("2. Update FRONTEND_URL with API Gateway URL");
    console.log("3. Deploy frontend to S3/CloudFront");
  } catch (error) {
    console.error("\n❌ Validation failed:", error.message);
    process.exit(1);
  }
}

// Run validation if called directly
if (require.main === module) {
  main();
}

module.exports = {
  loadProductionEnv,
  validateEnvironmentVariables,
  validateAWSConfiguration,
  validateServerlessConfiguration,
  generateDeploymentSummary,
};
