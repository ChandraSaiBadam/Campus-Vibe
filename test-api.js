#!/usr/bin/env node

const https = require("https");

const API_URL = "https://zfvsyqr372.execute-api.us-east-1.amazonaws.com/prod";

console.log("🔍 Testing Campus Vibe API...\n");

// Test health endpoint
function testHealth() {
  return new Promise((resolve, reject) => {
    const url = `${API_URL}/api/health`;
    console.log(`Testing: ${url}`);

    https
      .get(url, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            console.log("✅ Health Check Response:");
            console.log(JSON.stringify(response, null, 2));
            resolve(response);
          } catch (error) {
            console.log("✅ Health Check Response (raw):");
            console.log(data);
            resolve(data);
          }
        });
      })
      .on("error", (error) => {
        console.log("❌ Health Check Failed:");
        console.log(error.message);
        reject(error);
      });
  });
}

// Test basic API endpoint
function testAPI() {
  return new Promise((resolve, reject) => {
    const url = `${API_URL}/api`;
    console.log(`\nTesting: ${url}`);

    https
      .get(url, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          console.log("✅ API Response:");
          console.log(data);
          resolve(data);
        });
      })
      .on("error", (error) => {
        console.log("❌ API Test Failed:");
        console.log(error.message);
        reject(error);
      });
  });
}

// Run tests
async function runTests() {
  try {
    await testHealth();
    await testAPI();
    console.log("\n🎉 API tests completed!");
  } catch (error) {
    console.log(
      "\n❌ Some tests failed, but this might be expected for a minimal deployment."
    );
  }
}

runTests();
