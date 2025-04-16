import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logger } from '../middleware/logger.js';

dotenv.config();

// Connection configuration
const DB_OPTIONS = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 50,
  retryWrites: true,
  w: 'majority'
};

// Connection state tracker
let isConnected = false;
let retryAttempts = 0;
const MAX_RETRIES = 3;

/**
 * Enhanced MongoDB Connection Handler with:
 * - Automatic reconnection
 * - Connection state monitoring
 * - Retry mechanism
 * - Environment-based configuration
 */
const connectDB = async () => {
  if (isConnected) {
    logger.info('Using existing database connection');
    return;
  }

  try {
    logger.info('🔗 Attempting MongoDB connection...');
    
    // Connection events
    mongoose.connection.on('connecting', () => {
      logger.info('Connecting to MongoDB...');
    });

    mongoose.connection.on('connected', () => {
      isConnected = true;
      retryAttempts = 0;
      logger.info(`✅ MongoDB Connected: ${mongoose.connection.host}`);
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`❌ MongoDB Connection Error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('⚠️ MongoDB Disconnected');
      if (retryAttempts < MAX_RETRIES) {
        retryAttempts++;
        logger.info(`Retrying connection (Attempt ${retryAttempts}/${MAX_RETRIES})`);
        setTimeout(connectDB, 5000);
      }
    });

    mongoose.connection.on('reconnected', () => {
      isConnected = true;
      logger.info('♻️ MongoDB Reconnected');
    });

    // Actual connection
    await mongoose.connect(process.env.MONGO_URI, DB_OPTIONS);

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('🚪 MongoDB Connection Closed via App Termination');
      process.exit(0);
    });

  } catch (error) {
    logger.error(`❌ MongoDB Initial Connection Failed: ${error.message}`);
    
    if (retryAttempts < MAX_RETRIES) {
      retryAttempts++;
      logger.info(`Retrying connection (Attempt ${retryAttempts}/${MAX_RETRIES})`);
      setTimeout(connectDB, 5000);
    } else {
      process.exit(1);
    }
  }
};

export default connectDB;