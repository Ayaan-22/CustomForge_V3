// File: server/middleware/logger.js

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load logging environment variables
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, "../../logs");
const LOG_LEVEL_FILE = process.env.LOG_LEVEL_FILE || "info";
const LOG_LEVEL_CONSOLE = process.env.LOG_LEVEL_CONSOLE || "debug";
const SERVICE_NAME = process.env.SERVICE_NAME || "gaming-shop";
const MAX_LOG_SIZE = process.env.LOG_MAX_SIZE || "20m";
const MAX_LOG_FILES = process.env.LOG_MAX_FILES || "30d";

// Ensure logs directory exists with proper permissions
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  
  // Set directory permissions (read/write for owner, read for group, none for others)
  try {
    fs.chmodSync(LOG_DIR, 0o750);
  } catch (err) {
    console.warn('Could not set log directory permissions:', err.message);
  }
}

// Helper to mask sensitive fields in objects
const maskSensitiveData = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  
  const masked = Array.isArray(obj) ? [...obj] : { ...obj };
  
  const sensitiveFields = [
    'password', 'newPassword', 'confirmPassword', 'currentPassword',
    'token', 'accessToken', 'refreshToken', 'authorization',
    'creditCard', 'cvv', 'cardNumber', 'expiryDate',
    'ssn', 'socialSecurity', 'passport'
  ];
  
  const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie'];
  
  // Mask sensitive fields
  sensitiveFields.forEach(field => {
    if (masked[field]) {
      masked[field] = "***";
    }
  });
  
  // Mask sensitive headers
  if (masked.headers) {
    const headers = { ...masked.headers };
    sensitiveHeaders.forEach(header => {
      if (headers[header]) {
        headers[header] = "***";
      }
      if (headers[header.toLowerCase()]) {
        headers[header.toLowerCase()] = "***";
      }
    });
    masked.headers = headers;
  }
  
  // Recursively mask nested objects
  Object.keys(masked).forEach(key => {
    if (masked[key] && typeof masked[key] === 'object') {
      masked[key] = maskSensitiveData(masked[key]);
    }
  });
  
  return masked;
};

// Formatters
const timestampFormat = winston.format.timestamp({
  format: "YYYY-MM-DD HH:mm:ss",
});

const fileFormat = winston.format.combine(
  timestampFormat,
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  timestampFormat,
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const safeMeta = maskSensitiveData(meta);
    const metaString = Object.keys(safeMeta).length ? JSON.stringify(safeMeta) : "";
    return `[${timestamp}] [${SERVICE_NAME}] ${level}: ${message} ${metaString}`;
  })
);

// Logger transports
const transports = [
  new winston.transports.Console({
    level: LOG_LEVEL_CONSOLE,
    format: consoleFormat,
  }),
  new DailyRotateFile({
    level: LOG_LEVEL_FILE,
    filename: path.join(LOG_DIR, "application-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: MAX_LOG_SIZE,
    maxFiles: MAX_LOG_FILES,
    format: fileFormat,
    auditFile: path.join(LOG_DIR, ".audit.json"),
  }),
  new DailyRotateFile({
    level: "error",
    filename: path.join(LOG_DIR, "error-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: MAX_LOG_SIZE,
    maxFiles: MAX_LOG_FILES,
    format: fileFormat,
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: LOG_LEVEL_FILE,
  defaultMeta: { service: SERVICE_NAME },
  transports,
  exceptionHandlers: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    new DailyRotateFile({
      filename: path.join(LOG_DIR, "exceptions-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: MAX_LOG_SIZE,
      maxFiles: MAX_LOG_FILES,
      format: fileFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    new DailyRotateFile({
      filename: path.join(LOG_DIR, "rejections-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: MAX_LOG_SIZE,
      maxFiles: MAX_LOG_FILES,
      format: fileFormat,
    }),
  ],
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Request logging middleware
const requestLogger = (req, res, next) => {
  req.requestId = uuidv4();
  req.startTime = Date.now();

  // Skip favicon requests
  if (req.originalUrl !== "/favicon.ico") {
    const { method, originalUrl, ip, headers } = req;
    const userId = req.user?._id || "anonymous";

    // Mask sensitive headers before logging
    const safeHeaders = maskSensitiveData(headers);

    logger.info("HTTP Request", {
      requestId: req.requestId,
      route: originalUrl,
      method,
      ip,
      userId,
      userAgent: req.get("User-Agent"),
      headers: safeHeaders,
      body: maskSensitiveData(req.body),
      query: req.query,
      timestamp: new Date().toISOString(),
    });
  }

  // Response logging
  res.on("finish", () => {
    const responseTime = Date.now() - req.startTime;

    logger.info("HTTP Response", {
      requestId: req.requestId,
      route: req.originalUrl,
      method: req.method,
      status: res.statusCode,
      responseTime,
      userId: req.user?._id || "anonymous",
      contentLength: res.get('Content-Length'),
      timestamp: new Date().toISOString(),
    });
  });

  next();
};

// Performance logging middleware
const performanceLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log slow requests
    if (duration > 1000) { // 1 second threshold
      logger.warn('Slow request detected', {
        requestId: req.requestId,
        route: req.originalUrl,
        method: req.method,
        duration,
        threshold: 1000,
        userId: req.user?._id || 'anonymous',
      });
    }
    
    // Log very fast responses for optimization tracking
    if (duration < 10) {
      logger.debug('Very fast response', {
        requestId: req.requestId,
        route: req.originalUrl,
        method: req.method,
        duration,
      });
    }
  });
  
  next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  logger.error("HTTP Error", {
    requestId: req.requestId || "N/A",
    message: err.message,
    stack: err.stack,
    route: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?._id || "anonymous",
    statusCode: err.statusCode || 500,
    timestamp: new Date().toISOString(),
  });

  next(err);
};

// Security event logger
const securityLogger = {
  loginSuccess: (userId, ip, userAgent) => {
    logger.info('User login successful', {
      event: 'login_success',
      userId,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    });
  },
  
  loginFailed: (identifier, ip, reason, userAgent) => {
    logger.warn('User login failed', {
      event: 'login_failed',
      identifier: maskSensitiveData(identifier),
      ip,
      reason,
      userAgent,
      timestamp: new Date().toISOString(),
    });
  },
  
  passwordChange: (userId, ip) => {
    logger.info('Password changed', {
      event: 'password_change',
      userId,
      ip,
      timestamp: new Date().toISOString(),
    });
  },
  
  unauthorizedAccess: (route, method, ip, userId) => {
    logger.warn('Unauthorized access attempt', {
      event: 'unauthorized_access',
      route,
      method,
      ip,
      userId: userId || 'unknown',
      timestamp: new Date().toISOString(),
    });
  }
};

export { 
  logger, 
  requestLogger, 
  errorLogger, 
  performanceLogger, 
  securityLogger,
  maskSensitiveData 
};
export default logger;