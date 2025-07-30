// // File: server/server.js
// import dotenv from "dotenv";
// import express from "express";
// import cors from "cors";
// import helmet from "helmet";
// import rateLimit from "express-rate-limit";
// import mongoSanitize from "express-mongo-sanitize";
// import xss from "xss-clean";
// import hpp from "hpp";
// import compression from "compression";
// import connectDB from "./config/db.js";
// import path from "path";
// import { fileURLToPath } from "url";
// import { logger } from "./middleware/logger.js";

// // Routes
// import productRoutes from "./routes/productRoutes.js";
// import userRoutes from "./routes/userRoutes.js";
// import adminRoutes from "./routes/adminRoutes.js";
// import cartRoutes from "./routes/cartRoutes.js";
// import orderRoutes from "./routes/orderRoutes.js";
// import paymentRoutes from "./routes/paymentRoutes.js";
// import authRoutes from "./routes/authRoutes.js";
// import couponRoutes from "./routes/couponRoutes.js";
// import emailTestRoutes from "./routes/emailTestRoutes.js";

// // Middleware
// import { errorHandler } from "./middleware/errorMiddleware.js";
// import { requestLogger } from "./middleware/logger.js";

// // Load environment variables
// dotenv.config({ path: "./config/config.env" });

// // Connect to MongoDB
// await connectDB();

// // ES Module fix for __dirname
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const app = express();

// // Enhanced Security Middleware
// app.use(
//   helmet({
//     contentSecurityPolicy: {
//       directives: {
//         defaultSrc: ["'self'"],
//         scriptSrc: ["'self'", "'unsafe-inline'", process.env.CLIENT_URL],
//         styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
//         imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
//         connectSrc: ["'self'", process.env.CLIENT_URL],
//         fontSrc: ["'self'", "https://fonts.gstatic.com"],
//         objectSrc: ["'none'"],
//         upgradeInsecureRequests: [],
//       },
//     },
//     crossOriginResourcePolicy: { policy: "cross-origin" },
//   })
// );
// import dotenv from "dotenv";
// import express from "express";
// import cors from "cors";

// // Load environment variables
// dotenv.config({ path: "./config/config.env" });

// // Other imports and setup...

// const allowedOrigins = process.env.CORS_ORIGINS.split(',');

// app.use(
//   cors({
//     origin: (origin, callback) => {
//       if (!origin || allowedOrigins.includes(origin)) {
//         callback(null, origin);
//       } else {
//         callback(new Error('Not allowed by CORS'));
//       }
//     },
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization'],
//   })
// );

// app.use(express.json({ limit: "10kb" }));
// app.use(express.urlencoded({ extended: true, limit: "10kb" }));
// app.use(mongoSanitize());
// app.use(xss());
// app.use(
//   hpp({
//     whitelist: ["price", "ratings", "duration"], // Fields to allow duplicates for
//   })
// );
// app.use(compression());

// // Rate limiting (imported from config)
// import { apiLimiter, authLimiter, paymentLimiter } from "./config/rateLimit.js";
// app.use("/api", apiLimiter);
// app.use("/api/v1/auth", authLimiter);
// app.use("/api/v1/payment", paymentLimiter);

// // Request logging
// app.use(requestLogger);

// // Static files
// app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// // API Routes (versioned)
// app.use("/api/v1/auth", authRoutes);
// app.use("/api/v1/products", productRoutes);
// app.use("/api/v1/users", userRoutes);
// app.use("/api/v1/admin", adminRoutes);
// app.use("/api/v1/cart", cartRoutes);
// app.use("/api/v1/orders", orderRoutes);
// app.use("/api/v1/payment", paymentRoutes);
// app.use("/api/v1/coupons", couponRoutes);
// app.use("/api/v1/email", emailTestRoutes);

// // Health check endpoint
// app.get("/api/v1/health", (req, res) => {
//   res.status(200).json({
//     status: "success",
//     message: "Server is running",
//     uptime: process.uptime(),
//     timestamp: new Date().toISOString(),
//     environment: process.env.NODE_ENV,
//   });
// });

// // Handle 404 - Not Found
// app.all("*", (req, res, next) => {
//   logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
//   res.status(404).json({
//     status: "fail",
//     message: `Can't find ${req.originalUrl} on this server!`,
//   });
// });

// // Error Handling Middleware
// app.use(errorHandler);

// // Server Configuration
// const PORT = process.env.PORT || 5000;
// const ENV = process.env.NODE_ENV || "development";

// const server = app.listen(PORT, () => {
//   logger.info(`🚀 Server running in ${ENV} mode on port ${PORT}`);
//   logger.info(`🔗 API Base URL: http://localhost:${PORT}/api/v1`);
// });

// // Enhanced Error Handling
// process.on("unhandledRejection", (err) => {
//   logger.error("❌ Unhandled Rejection:", err);
//   server.close(() => {
//     process.exit(1);
//   });
// });

// process.on("SIGTERM", () => {
//   logger.info("👋 SIGTERM received. Shutting down gracefully");
//   server.close(() => {
//     logger.info("💥 Process terminated");
//   });
// });

// File: server/server.js
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import hpp from "hpp";
import compression from "compression";
import connectDB from "./config/db.js";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./middleware/logger.js";

// Routes
import productRoutes from "./routes/productRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import emailTestRoutes from "./routes/emailTestRoutes.js";

// Middleware
import { errorHandler } from "./middleware/errorMiddleware.js";
import { requestLogger } from "./middleware/logger.js";

// Load environment variables
dotenv.config({ path: "./config/config.env" });

// Connect to MongoDB
await connectDB();

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enhanced Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", process.env.CLIENT_URL],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
        connectSrc: ["'self'", process.env.CLIENT_URL],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGINS.split(",");
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(mongoSanitize());
app.use(xss());
app.use(
  hpp({
    whitelist: ["price", "ratings", "duration"],
  })
);
app.use(compression());

// Rate limiting
import { apiLimiter, authLimiter, paymentLimiter } from "./config/rateLimit.js";
app.use("/api", apiLimiter);
app.use("/api/v1/auth", authLimiter);
app.use("/api/v1/payment", paymentLimiter);

// Request logging
app.use(requestLogger);

// Static files
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// API Routes (versioned)
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/coupons", couponRoutes);
app.use("/api/v1/email", emailTestRoutes);

// Health check endpoint
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is running",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Handle 404 - Not Found
app.all("*", (req, res, next) => {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server!`,
  });
});

// Error Handling Middleware
app.use(errorHandler);

// Server Configuration
const PORT = process.env.PORT || 5000;
const ENV = process.env.NODE_ENV || "development";

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running in ${ENV} mode on port ${PORT}`);
  logger.info(`🔗 API Base URL: http://localhost:${PORT}/api/v1`);
});

// Enhanced Error Handling
process.on("unhandledRejection", (err) => {
  logger.error("❌ Unhandled Rejection:", err);
  server.close(() => {
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  logger.info("👋 SIGTERM received. Shutting down gracefully");
  server.close(() => {
    logger.info("💥 Process terminated");
  });
});
