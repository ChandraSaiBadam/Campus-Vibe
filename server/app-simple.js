const express = require("express");
const cors = require("cors");

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Simple test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    status: "OK",
    message: "Lambda is working perfectly!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "unknown",
  });
});

// Simple health endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Campus Vibe API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "unknown",
    lambda: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Campus Vibe API",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

module.exports = app;
