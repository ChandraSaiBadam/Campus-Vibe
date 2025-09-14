const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

// Import monitoring utilities
const { monitoringMiddleware } = require("./utils/monitoring");
const {
  costTrackingMiddleware,
  getCostDashboard,
} = require("./utils/costMonitoring");

// Import routes
const gpaRoutes = require("./routes/gpa");
const marketplaceRoutes = require("./routes/marketplace");
const reviewsRoutes = require("./routes/reviews");
const forumRoutes = require("./routes/forum");
const timetableRoutes = require("./routes/timetable");
const monitoringRoutes = require("./routes/monitoring");

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 5001;

// Trust proxy for rate limiting
app.set("trust proxy", 1);

// Security middleware
app.use(helmet());
app.use(compression());

// Monitoring and cost tracking middleware
app.use(monitoringMiddleware());
app.use(costTrackingMiddleware());

// Rate limiting with Lambda-compatible configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  // Handle cases where IP might not be available (like in Lambda)
  keyGenerator: (req) => {
    return (
      req.ip ||
      req.connection?.remoteAddress ||
      req.headers["x-forwarded-for"] ||
      "unknown"
    );
  },
  // Skip rate limiting if IP cannot be determined
  skip: (req) => {
    const ip =
      req.ip || req.connection?.remoteAddress || req.headers["x-forwarded-for"];
    return !ip || ip === "unknown";
  },
});
app.use("/api/", limiter);

// Logging - use shorter dev output when developing
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

// CORS configuration - optimized for Lambda and API Gateway
const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

const corsOptions = {
  origin: function (origin, callback) {
    // In Lambda/API Gateway, allow all origins for simplicity
    // API Gateway will handle CORS properly
    if (isLambda) {
      callback(null, true);
      return;
    }

    // For local development, be more restrictive
    const allowedOrigins = [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: !isLambda, // Disable credentials in Lambda (API Gateway handles this)
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-Amz-Date",
    "X-Api-Key",
    "X-Amz-Security-Token",
    "Accept",
    "Accept-Language",
    "Accept-Encoding",
    "Cache-Control",
  ],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static files for uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API Routes
app.use("/api/gpa", gpaRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/forum", forumRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/monitoring", monitoringRoutes);

// Simple test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    status: "OK",
    message: "Lambda is working!",
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint with comprehensive monitoring
app.get("/api/health", (req, res) => {
  try {
    res.json({
      status: "OK",
      message: "Campus Connect API is running",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "unknown",
      lambda: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
    });
  } catch (error) {
    console.error("Health check error:", error);
    res.status(503).json({
      status: "ERROR",
      message: "Health check failed",
      timestamp: new Date().toISOString(),
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Service unavailable",
    });
  }
});

// Cost monitoring dashboard endpoint
app.get("/api/monitoring/costs", (req, res) => {
  try {
    const costDashboard = getCostDashboard();
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      data: costDashboard,
    });
  } catch (error) {
    console.error("Cost monitoring error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to retrieve cost data",
      timestamp: new Date().toISOString(),
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal error",
    });
  }
});

// Lambda warm-up endpoint
app.get("/api/warmup", async (req, res) => {
  const { warmUp } = require("./utils/lambdaHealth");

  try {
    const result = await warmUp();
    res.json({
      message: "Lambda warm-up completed",
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Warm-up error:", error);
    res.status(500).json({
      message: "Lambda warm-up failed",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Warm-up failed",
      timestamp: new Date().toISOString(),
    });
  }
});

// Enhanced error handling middleware for Lambda and local environments
app.use((err, req, res, next) => {
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  const isDevelopment = process.env.NODE_ENV === "development";

  // Enhanced error logging for Lambda debugging
  if (isLambda) {
    console.error("Lambda Error:", {
      message: err.message,
      stack: err.stack,
      name: err.name,
      code: err.code,
      requestId: req.context?.awsRequestId,
      functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
      functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
    });
  } else {
    console.error("Server Error:", err.stack);
  }

  // Determine error status code
  const statusCode = err.statusCode || err.status || 500;

  // Handle specific error types
  let errorResponse = {
    error: "Something went wrong!",
    message: "Internal server error",
  };

  if (err.name === "ValidationError") {
    errorResponse = {
      error: "Validation Error",
      message: isDevelopment ? err.message : "Invalid input data",
    };
  } else if (err.name === "MongoError" || err.name === "MongooseError") {
    errorResponse = {
      error: "Database Error",
      message: isDevelopment ? err.message : "Database operation failed",
    };
  } else if (err.name === "JsonWebTokenError") {
    errorResponse = {
      error: "Authentication Error",
      message: "Invalid or expired token",
    };
  } else if (isDevelopment) {
    errorResponse.message = err.message;
    errorResponse.stack = err.stack;
  }

  // Add Lambda-specific error context in development
  if (isLambda && isDevelopment && req.context) {
    errorResponse.lambda = {
      requestId: req.context.awsRequestId,
      functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
      remainingTime: req.context.getRemainingTimeInMillis(),
    };
  }

  res.status(statusCode).json(errorResponse);
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// MongoDB Connection with Lambda optimization and connection pooling
let cachedConnection = null;

const connectToMongoDB = async () => {
  try {
    // In Lambda, reuse existing connection if available
    if (cachedConnection && mongoose.connection.readyState === 1) {
      console.log("✅ Using cached MongoDB connection");
      return cachedConnection;
    }

    // Check if already connected (important for Lambda container reuse)
    if (mongoose.connection.readyState === 1) {
      console.log("✅ Using existing MongoDB connection");
      cachedConnection = mongoose.connection;
      return cachedConnection;
    }

    // Lambda-optimized connection options with proper pooling
    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    const options = {
      // Connection timeouts optimized for Lambda cold starts
      serverSelectionTimeoutMS: isLambda ? 3000 : 5000,
      socketTimeoutMS: isLambda ? 30000 : 45000,
      connectTimeoutMS: isLambda ? 3000 : 10000,

      // Connection pooling optimized for Lambda
      maxPoolSize: isLambda ? 3 : 10, // Smaller pool for Lambda to reduce memory usage
      minPoolSize: isLambda ? 1 : 2,
      maxIdleTimeMS: isLambda ? 30000 : 60000, // Close idle connections faster in Lambda

      // Lambda-specific optimizations
      bufferCommands: false, // Disable mongoose buffering for Lambda
      bufferMaxEntries: 0, // Disable mongoose buffering

      // Reliability settings
      retryWrites: true,
      retryReads: true,
      w: "majority",

      // Heartbeat settings for Lambda
      heartbeatFrequencyMS: isLambda ? 30000 : 10000,

      // Compression for better performance
      compressors: ["zlib"],
      zlibCompressionLevel: 6,
    };

    const mongoUri =
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/vitconnect";

    console.log(`🔌 Connecting to MongoDB (Lambda: ${isLambda})...`);
    await mongoose.connect(mongoUri, options);
    console.log("✅ Connected to MongoDB Atlas successfully");

    // Cache the connection for Lambda reuse
    cachedConnection = mongoose.connection;

    // Enhanced connection event handlers for Lambda
    const db = mongoose.connection;

    db.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
      cachedConnection = null; // Clear cache on error
    });

    db.on("disconnected", () => {
      console.log("⚠️  MongoDB disconnected");
      cachedConnection = null; // Clear cache on disconnect
    });

    db.on("reconnected", () => {
      console.log("✅ MongoDB reconnected");
      cachedConnection = db;
    });

    // Lambda-specific connection monitoring
    if (isLambda) {
      db.on("close", () => {
        console.log("🔌 MongoDB connection closed (Lambda)");
        cachedConnection = null;
      });
    }

    return cachedConnection;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    cachedConnection = null;

    // Enhanced error logging for Lambda debugging
    if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
      console.error("Lambda MongoDB Error Details:", {
        name: error.name,
        message: error.message,
        code: error.code,
        codeName: error.codeName,
      });
    }

    console.log("⚠️  Running in offline mode - some features may be limited");
    console.log("💡 To enable full functionality:");
    console.log("   1. Go to MongoDB Atlas dashboard");
    console.log("   2. Add your IP address to the whitelist");
    console.log(
      "   3. Or use 0.0.0.0/0 for development (not recommended for production)"
    );
    return false;
  }
};

// Initialize MongoDB connection for Lambda or local server with enhanced error handling
const initializeApp = async () => {
  let mongoConnected = false;
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  try {
    mongoConnected = await connectToMongoDB();

    // Lambda-specific initialization
    if (isLambda) {
      console.log("🚀 Lambda environment initialized");

      // Set up Lambda-specific error handlers
      process.on("unhandledRejection", (reason, promise) => {
        console.error("Unhandled Rejection in Lambda:", reason);
        // Don't exit in Lambda, just log the error
      });

      process.on("uncaughtException", (error) => {
        console.error("Uncaught Exception in Lambda:", error);
        // Don't exit in Lambda, just log the error
      });
    }
  } catch (error) {
    console.error("⚠️  App initialization error:", error);

    if (isLambda) {
      // In Lambda, we should still try to handle requests even if DB fails
      console.log("⚠️  Lambda continuing without database connection");
    } else {
      console.log("⚠️  Local server continuing without database");
    }
  }

  return mongoConnected;
};

// Start server with proper error handling (only for local development)
const startServer = async () => {
  const mongoConnected = await initializeApp();

  try {
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🌐 Frontend: http://localhost:3000`);
      if (!mongoConnected) {
        console.log(
          "⚠️  Note: Running without database - data will not persist"
        );
        console.log("💡 Features that work offline: GPA Calculator");
        console.log(
          "💡 Features that need database: Marketplace, Reviews, Q&A Forum, FFCS Timetable"
        );
      }
    });
  } catch (error) {
    if (error.code === "EADDRINUSE") {
      console.error(`❌ Port ${PORT} is already in use`);
      console.log("💡 Try:");
      console.log(`   1. Kill the process using port ${PORT}`);
      console.log(`   2. Or change PORT in .env file`);
      process.exit(1);
    } else {
      console.error("❌ Server startup error:", error);
      process.exit(1);
    }
  }
};

// Graceful shutdown (only for local development)
const shutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  try {
    await mongoose.disconnect();
    console.log("🔌 MongoDB disconnected");
  } catch (err) {
    console.warn("Error while disconnecting MongoDB:", err.message || err);
  }
  process.exit(0);
};

// Only start server if not in Lambda environment
if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
  // Running in Lambda - just initialize the database connection
  initializeApp().catch(console.error);
} else {
  // Running locally - start the server
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  startServer();
}

module.exports = app;
