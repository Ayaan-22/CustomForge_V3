// File: server/config/db.js

import mongoose from "mongoose";
import dotenv from "dotenv";
import { logger } from "../middleware/logger.js";

dotenv.config();

// Check for required environment variable
if (!process.env.MONGO_URI) {
  logger.error("[DB] ❌ MONGO_URI not defined in environment");
  process.exit(1);
}

// Global mongoose config (optional for Mongoose v7+)
mongoose.set("strictQuery", true);

// Connection configuration
const DB_OPTIONS = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 50,
  retryWrites: true,
  w: "majority",
};

// Retry & state config
let isConnected = false;
let retryAttempts = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = process.env.RETRY_DELAY_MS || 5000;

/**
 * Enhanced MongoDB Connection Handler
 */
const connectDB = async () => {
  if (isConnected) {
    logger.info("[DB] Using existing MongoDB connection");
    return;
  }

  try {
    logger.info("[DB] 🔗 Attempting MongoDB connection...");

    // Mongoose connection events
    mongoose.connection.on("connecting", () => {
      logger.info("[DB] Connecting to MongoDB...");
    });

    mongoose.connection.on("connected", () => {
      isConnected = true;
      retryAttempts = 0;
      logger.info(`[DB] ✅ MongoDB Connected: ${mongoose.connection.host}`);
    });

    mongoose.connection.on("error", (err) => {
      logger.error(`[DB] ❌ MongoDB Error: ${err.message}`);
    });

    mongoose.connection.on("disconnected", () => {
      isConnected = false;
      logger.warn("[DB] ⚠️ MongoDB Disconnected");
      if (retryAttempts < MAX_RETRIES) {
        retryAttempts++;
        logger.info(
          `[DB] Retrying connection (${retryAttempts}/${MAX_RETRIES}) in ${RETRY_DELAY_MS}ms`
        );
        setTimeout(connectDB, RETRY_DELAY_MS);
      } else {
        logger.error("[DB] ❌ Maximum retry attempts reached. Exiting...");
        process.exit(1);
        // Alternatively, throw new Error('MongoDB connection failed after retries');
      }
    });

    mongoose.connection.on("reconnected", () => {
      isConnected = true;
      logger.info("[DB] ♻️ MongoDB Reconnected");
    });

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, DB_OPTIONS);

    // Graceful shutdown
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      logger.info("[DB] 🚪 MongoDB Connection Closed via App Termination");
      process.exit(0);
    });
  } catch (error) {
    logger.error(`[DB] ❌ Initial MongoDB Connection Failed: ${error.message}`);

    if (retryAttempts < MAX_RETRIES) {
      retryAttempts++;
      logger.info(
        `[DB] Retrying connection (${retryAttempts}/${MAX_RETRIES}) in ${RETRY_DELAY_MS}ms`
      );
      setTimeout(connectDB, RETRY_DELAY_MS);
    } else {
      logger.error("[DB] ❌ All retry attempts failed. Terminating process...");
      process.exit(1);
      // Or: throw new Error('MongoDB connection failed after retries');
    }
  }
};

export default connectDB;
