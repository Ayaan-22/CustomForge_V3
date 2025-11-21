// server/server.js
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import hpp from "hpp";
import compression from "compression";
import connectDB from "./config/db.js";
import path from "path";
import { fileURLToPath } from "url";
import {
  logger,
  requestLogger,
  performanceLogger,
  errorLogger,
  requestIdMiddleware,
} from "./middleware/logger.js";
import {
  apiLimiter,
  authLimiter,
  paymentLimiter,
  adminLimiter,
  publicLimiter,
  logRateLimiter,
} from "./config/rateLimit.js";

// Routes
import productRoutes from "./routes/productRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import emailTestRoutes from "./routes/emailTestRoutes.js";
import { handleWebhook } from "./controllers/paymentController.js";

// Error handling middleware
import { errorHandler } from "./middleware/errorMiddleware.js";

// Load environment variables
dotenv.config({ path: "./config/config.env" });

// Connect to MongoDB
await connectDB();

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ----------------------------
// 🛡️  Security Middleware
// ----------------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", process.env.CLIENT_URL],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
        ],
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

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ----------------------------
// ⚡ Stripe Webhook (Raw Body)
// ----------------------------
// Must come BEFORE express.json()
app.post(
  "/api/v1/payment/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

// ----------------------------
// 🧰  Body Parsing & Sanitization
// ----------------------------
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(mongoSanitize());
app.use(xss());
app.use(
  hpp({
    whitelist: ["price", "ratings", "duration"], // allow duplicates for these
  })
);
app.use(compression());

// ----------------------------
// 🕵️  Logging & Request ID
// ----------------------------
app.use(requestIdMiddleware);   // ensure every request has an ID
app.use(requestLogger);         // log each request + response
app.use(performanceLogger);     // detect slow/fast requests

// Optionally expose Request ID to frontend (kept for backward compatibility)
app.use((req, res, next) => {
  if (req.requestId) res.setHeader("X-Request-ID", req.requestId);
  next();
});

// ----------------------------
// 🚦  Rate Limiting
// ----------------------------
app.use("/api", apiLimiter);
app.use("/api/v1/auth", authLimiter);
app.use("/api/v1/payment", paymentLimiter);

// (adminLimiter, logRateLimiter can be attached to specific routes as needed)
app.use(publicLimiter); // Apply to all other requests

// ----------------------------
// 📁  Static Files
// ----------------------------
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// ----------------------------
// 🧩  API Routes
// ----------------------------
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/email", emailTestRoutes);

// ----------------------------
// 💚  Health Check Endpoint
// ----------------------------
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is running",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    requestId: req.requestId,
  });
});

// ----------------------------
// ❌  Handle 404
// ----------------------------
app.all("*", (req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server!`,
    requestId: req.requestId,
  });
});

// ----------------------------
// 🧨  Error Handling Middleware
// ----------------------------
app.use(errorLogger);
app.use(errorHandler);

// ----------------------------
// 🚀  Start Server
// ----------------------------
const PORT = process.env.PORT || 5000;
const ENV = process.env.NODE_ENV || "development";

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running in ${ENV} mode on port ${PORT}`);
  logger.info(`🔗 API Base URL: http://localhost:${PORT}/api/v1`);
});

// ----------------------------
// 🧯  Graceful Shutdown
// ----------------------------
process.on("unhandledRejection", (err) => {
  logger.error("❌ Unhandled Rejection", {
    message: err.message,
    stack: err.stack,
  });
  server.close(() => process.exit(1));
});

process.on("SIGTERM", () => {
  logger.info("👋 SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    logger.info("💥 Process terminated");
  });
});
