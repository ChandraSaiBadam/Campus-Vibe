const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

// Import routes
const gpaRoutes = require("./routes/gpa");
const marketplaceRoutes = require("./routes/marketplace");
const reviewsRoutes = require("./routes/reviews");
const forumRoutes = require("./routes/forum");
const timetableRoutes = require("./routes/timetable");

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 5001;

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use("/api/", limiter);

// Logging - use shorter dev output when developing
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

// CORS configuration - support production domains
const corsOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL, 'https://yourdomain.com', 'https://www.yourdomain.com'] // Allow S3 bucket and custom domain
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token']
}));

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

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Campus Connect API is running",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// MongoDB Connection with proper error handling
const connectToMongoDB = async () => {
  try {
    // Set connection options for better reliability
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      w: "majority",
    };

  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/vitconnect";
  await mongoose.connect(mongoUri, options);
    console.log("✅ Connected to MongoDB Atlas successfully");

    // Test the connection
    const db = mongoose.connection;
    db.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    db.on("disconnected", () => {
      console.log("⚠️  MongoDB disconnected");
    });

    return true;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
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

// Start server with proper error handling
const startServer = async () => {
  let mongoConnected = false;

  try {
    mongoConnected = await connectToMongoDB();
  } catch (error) {
    console.log("⚠️  MongoDB connection failed, continuing without database");
  }

  try {
  const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🌐 Frontend: http://localhost:3000`);
      if (!mongoConnected) {
        console.log(
          "⚠️  Note: Running without database - data will not persist"
        );
        console.log(
          "💡 Features that work offline: GPA Calculator"
        );
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

// Graceful shutdown
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

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer();

module.exports = app;
