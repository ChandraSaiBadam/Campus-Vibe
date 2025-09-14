#!/usr/bin/env node

/**
 * Quick Health Check Script
 *
 * Fast validation of essential health endpoints for rapid deployment verification.
 * This script provides a quick pass/fail check for critical system components.
 *
 * Requirements addressed:
 * - 4.2: API calls respond within 2 seconds
 * - 1.2: Application remains available and responsive
 */

const axios = require("axios");
const { performance } = require("perf_hooks");

async function quickHealthCheck(baseUrl = "http://localhost:5001") {
  const url = baseUrl.replace(/\/$/, "");
  console.log(`🔍 Quick Health Check: ${url}`);
  console.log("=".repeat(50));

  const client = axios.create({
    baseURL: url,
    timeout: 5000,
    headers: { "User-Agent": "QuickHealthCheck/1.0" },
  });

  const tests = [
    {
      name: "Basic Health",
      endpoint: "/api/health",
      required: true,
    },
    {
      name: "Monitoring Health",
      endpoint: "/api/monitoring/health",
      required: true,
    },
    {
      name: "System Status",
      endpoint: "/api/monitoring/status",
      required: true,
    },
    {
      name: "Readiness Probe",
      endpoint: "/api/monitoring/ready",
      required: true,
    },
    {
      name: "Cost Monitoring",
      endpoint: "/api/monitoring/costs",
      required: false,
    },
  ];

  let passed = 0;
  let failed = 0;
  let warnings = 0;

  for (const test of tests) {
    const start = performance.now();

    try {
      const response = await client.get(test.endpoint);
      const end = performance.now();
      const duration = end - start;

      if (response.status === 200 && duration < 2000) {
        console.log(`✅ ${test.name} - ${Math.round(duration)}ms`);
        passed++;
      } else if (response.status === 200) {
        console.log(`⚠️  ${test.name} - ${Math.round(duration)}ms (slow)`);
        warnings++;
      } else {
        console.log(`❌ ${test.name} - Status ${response.status}`);
        if (test.required) failed++;
        else warnings++;
      }
    } catch (error) {
      const end = performance.now();
      const duration = end - start;

      console.log(`❌ ${test.name} - ${error.message}`);
      if (test.required) failed++;
      else warnings++;
    }

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log("=".repeat(50));
  console.log(
    `📊 Results: ${passed} passed, ${warnings} warnings, ${failed} failed`
  );

  if (failed === 0) {
    console.log("🎉 System is healthy!");
    return true;
  } else {
    console.log("⚠️  System has issues that need attention");
    return false;
  }
}

// CLI usage
if (require.main === module) {
  const baseUrl =
    process.argv[2] || process.env.API_BASE_URL || "http://localhost:5001";

  quickHealthCheck(baseUrl)
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Quick health check failed:", error.message);
      process.exit(1);
    });
}

module.exports = quickHealthCheck;
