// File: server/middleware/logger.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load from .env or use defaults
const LOG_DIR            = process.env.LOG_DIR || path.join(__dirname, '../../logs');
const LOG_LEVEL_FILE     = process.env.LOG_LEVEL_FILE || 'info';
const LOG_LEVEL_CONSOLE  = process.env.LOG_LEVEL_CONSOLE || 'debug';
const SERVICE_NAME       = process.env.SERVICE_NAME || 'gaming-shop';
const MAX_LOG_SIZE       = process.env.LOG_MAX_SIZE || '20m';
const MAX_LOG_FILES      = process.env.LOG_MAX_FILES || '30d';

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Common timestamp format
const timestampFormat = winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' });

// JSON format for files
const fileFormat = winston.format.combine(
  timestampFormat,
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Simple, colored format for console
const consoleFormat = winston.format.combine(
  timestampFormat,
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `[${timestamp}] [${SERVICE_NAME}] ${level}: ${message} ${metaString}`;
  })
);

// Transports
const transports = [
  // Console output
  new winston.transports.Console({
    level: LOG_LEVEL_CONSOLE,
    format: consoleFormat
  }),

  // All logs (info and above) rotated daily
  new DailyRotateFile({
    level: LOG_LEVEL_FILE,
    filename: path.join(LOG_DIR, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: MAX_LOG_SIZE,
    maxFiles: MAX_LOG_FILES,
    format: fileFormat
  }),

  // Error logs rotated daily
  new DailyRotateFile({
    level: 'error',
    filename: path.join(LOG_DIR, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: MAX_LOG_SIZE,
    maxFiles: MAX_LOG_FILES,
    format: fileFormat
  })
];

// Create the logger
const logger = winston.createLogger({
  level: LOG_LEVEL_FILE,
  defaultMeta: { service: SERVICE_NAME },
  transports,
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: MAX_LOG_SIZE,
      maxFiles: MAX_LOG_FILES,
      format: fileFormat
    })
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: MAX_LOG_SIZE,
      maxFiles: MAX_LOG_FILES,
      format: fileFormat
    })
  ]
});

// Request logging middleware
const requestLogger = (req, res, next) => {
  const { method, originalUrl, ip } = req;
  const userId = req.user?._id || 'anonymous';
  
  logger.info('HTTP Request', {
    route: originalUrl,
    method,
    ip,
    userId,
    userAgent: req.get('User-Agent')
  });
  
  next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  logger.error('HTTP Error', {
    message: err.message,
    stack: err.stack,
    route: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?._id || 'anonymous'
  });
  
  next(err);
};

export { logger, requestLogger, errorLogger };
export default logger;
