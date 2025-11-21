// server/middleware/logger.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Default configuration (override with environment variables)
 */
const CONFIG = {
  LOG_DIR: process.env.LOG_DIR || path.join(__dirname, "../../logs"),
  LOG_LEVEL_FILE: process.env.LOG_LEVEL_FILE || "info",
  LOG_LEVEL_CONSOLE: process.env.LOG_LEVEL_CONSOLE || "debug",
  SERVICE_NAME: process.env.SERVICE_NAME || "gaming-shop",
  MAX_LOG_SIZE: process.env.LOG_MAX_SIZE || "20m",
  MAX_LOG_FILES: process.env.LOG_MAX_FILES || "30d",
  SENSITIVE_FIELDS: (process.env.LOG_SENSITIVE_FIELDS ||
    "password,newPassword,confirmPassword,currentPassword,token,accessToken,refreshToken,authorization,creditCard,cvv,cardNumber,expiryDate,ssn,socialSecurity,passport")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  SENSITIVE_HEADERS: (process.env.LOG_SENSITIVE_HEADERS ||
    "authorization,cookie,set-cookie")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  HEADER_WHITELIST: (process.env.LOG_HEADER_WHITELIST ||
    "user-agent,content-type,accept,referer,x-forwarded-for")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  SLOW_REQUEST_THRESHOLD_MS: parseInt(
    process.env.LOG_SLOW_REQUEST_THRESHOLD || "1000",
    10
  ),
  FAST_REQUEST_THRESHOLD_MS: parseInt(
    process.env.LOG_FAST_REQUEST_THRESHOLD || "10",
    10
  ),
  ENABLE_FAST_LOGS: process.env.LOG_ENABLE_FAST === "true",
  MAX_PAYLOAD_LOG_BYTES: parseInt(
    process.env.LOG_MAX_PAYLOAD_BYTES || "20000",
    10
  ), // if larger, don't traverse
  MASK_IP: process.env.LOG_MASK_IP || "last-octet", // "last-octet" | "hash" | "none"
  SET_RESPONSE_HEADER_REQUEST_ID:
    (process.env.LOG_SET_RESPONSE_HEADER_REQUEST_ID || "true") === "true",
  ROTATE_AUDIT_FILE: process.env.LOG_ROTATE_AUDIT_FILE || ".audit.json",
};

/**
 * Ensure log directory exists and try to set safe permissions.
 */
try {
  if (!fs.existsSync(CONFIG.LOG_DIR)) {
    fs.mkdirSync(CONFIG.LOG_DIR, { recursive: true });
  }
  // Attempt to set permissions to 750 (rwx for owner, rx for group, none for others)
  try {
    fs.chmodSync(CONFIG.LOG_DIR, 0o750);
  } catch (err) {
    // Non-fatal; log to console only
    console.warn("Could not set log directory permissions:", err.message);
  }
} catch (err) {
  console.error("Could not create log directory:", err.message);
}

/**
 * Helper: protect audit file (best-effort).
 */
try {
  const auditPath = path.join(CONFIG.LOG_DIR, CONFIG.ROTATE_AUDIT_FILE);
  // Create the audit file if not exists, then restrict permissions
  if (!fs.existsSync(auditPath)) {
    fs.writeFileSync(auditPath, "{}");
  }
  try {
    fs.chmodSync(auditPath, 0o600);
  } catch (err) {
    // ignore permission errors (could be on Windows)
  }
} catch (err) {
  // ignore
}

/**
 * Utility: mask / sanitize sensitive data before logging.
 */
export const maskSensitiveData = (input, seen = new WeakSet()) => {
  // primitives
  if (
    input == null ||
    typeof input === "string" ||
    typeof input === "number" ||
    typeof input === "boolean"
  ) {
    return input;
  }

  // Avoid circular references
  if (typeof input === "object") {
    if (seen.has(input)) return "***CIRCULAR***";
    seen.add(input);
  }

  // Buffer check
  if (Buffer.isBuffer(input)) return "***BUFFER***";

  // Stream / File detection (best-effort)
  if (
    input instanceof fs.ReadStream ||
    (input && typeof input.pipe === "function")
  ) {
    return "***STREAM_OR_FILE***";
  }

  // Avoid traversing very large payloads
  try {
    const roughSize = JSON.stringify(input)?.length || 0;
    if (roughSize > CONFIG.MAX_PAYLOAD_LOG_BYTES)
      return `***LARGE_PAYLOAD:${roughSize}B***`;
  } catch (err) {
    // if stringify fails, fall back to placeholder
    return "***UNSERIALIZABLE_PAYLOAD***";
  }

  // If array, map
  if (Array.isArray(input)) {
    return input.map((item) => maskSensitiveData(item, seen));
  }

  // Object - create shallow copy to avoid mutation
  const out = {};
  const lowerCaseSensitive = CONFIG.SENSITIVE_FIELDS.map((s) =>
    s.toLowerCase()
  );

  for (const key of Object.keys(input)) {
    try {
      const lcKey = key.toLowerCase();

      // Mask sensitive fields
      if (lowerCaseSensitive.includes(lcKey)) {
        out[key] = "***";
        continue;
      }

      // Common header objects
      if (lcKey === "headers" && typeof input[key] === "object") {
        out[key] = {};
        for (const h of Object.keys(input[key])) {
          const lcH = h.toLowerCase();
          if (
            CONFIG.SENSITIVE_HEADERS.includes(lcH) ||
            lowerCaseSensitive.includes(lcH)
          ) {
            out[key][h] = "***";
          } else if (CONFIG.HEADER_WHITELIST.includes(lcH)) {
            out[key][h] = input[key][h];
          } else {
            out[key][h] = "***OMITTED***";
          }
        }
        continue;
      }

      // Query params masking
      if (lcKey === "query" && typeof input[key] === "object") {
        out[key] = {};
        for (const qk of Object.keys(input[key])) {
          out[key][qk] = lowerCaseSensitive.includes(qk.toLowerCase())
            ? "***"
            : maskSensitiveData(input[key][qk], seen);
        }
        continue;
      }

      // IP masking option
      if (
        lcKey === "ip" ||
        lcKey === "remoteaddress" ||
        lcKey === "x-forwarded-for"
      ) {
        const ipVal = input[key];
        if (typeof ipVal === "string") {
          if (CONFIG.MASK_IP === "hash") {
            out[key] = crypto
              .createHash("sha256")
              .update(ipVal)
              .digest("hex");
          } else if (CONFIG.MASK_IP === "last-octet") {
            out[key] = ipVal.replace(/(\d+)$/, "***");
          } else {
            out[key] = ipVal;
          }
          continue;
        }
      }

      // Default recursive mask
      out[key] = maskSensitiveData(input[key], seen);
    } catch (err) {
      out[key] = "***MASK_ERROR***";
    }
  }

  return out;
};

/**
 * Winston formats
 */
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
    const metaString =
      safeMeta && Object.keys(safeMeta).length
        ? JSON.stringify(safeMeta)
        : "";
    return `[${timestamp}] [${CONFIG.SERVICE_NAME}] ${level}: ${message} ${metaString}`;
  })
);

/**
 * Transport factory to avoid duplication
 */
const createDailyFileTransport = ({ filename, level = "info" }) => {
  return new DailyRotateFile({
    level,
    filename: path.join(CONFIG.LOG_DIR, filename),
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: CONFIG.MAX_LOG_SIZE,
    maxFiles: CONFIG.MAX_LOG_FILES,
    format: fileFormat,
    auditFile: path.join(CONFIG.LOG_DIR, CONFIG.ROTATE_AUDIT_FILE),
  });
};

/**
 * Initialize logger
 */
export let logger = null;

export function initLogger(options = {}) {
  const opt = { ...CONFIG, ...options };

  const transports = [
    new winston.transports.Console({
      level: opt.LOG_LEVEL_CONSOLE,
      format: consoleFormat,
    }),
    createDailyFileTransport({
      filename: "application-%DATE%.log",
      level: opt.LOG_LEVEL_FILE,
    }),
    createDailyFileTransport({
      filename: "error-%DATE%.log",
      level: "error",
    }),
  ];

  logger = winston.createLogger({
    level: opt.LOG_LEVEL_FILE,
    defaultMeta: { service: opt.SERVICE_NAME },
    transports,
    exceptionHandlers: [
      new winston.transports.Console({ format: consoleFormat }),
      createDailyFileTransport({
        filename: "exceptions-%DATE%.log",
        level: "error",
      }),
    ],
    rejectionHandlers: [
      new winston.transports.Console({ format: consoleFormat }),
      createDailyFileTransport({
        filename: "rejections-%DATE%.log",
        level: "error",
      }),
    ],
    exitOnError: false,
  });

  return logger;
}

// Initialize default logger on import
initLogger();

/**
 * Middleware: ensures every request has a request id.
 * Should be registered very early in middleware chain.
 */
export const requestIdMiddleware = (req, res, next) => {
  if (!req.requestId) {
    req.requestId = uuidv4();
  }

  if (CONFIG.SET_RESPONSE_HEADER_REQUEST_ID) {
    try {
      res.setHeader("X-Request-ID", req.requestId);
    } catch (err) {
      // ignore
    }
  }

  next();
};

/**
 * Request logging middleware: logs incoming request (lightweight)
 */
export const requestLogger = (req, res, next) => {
  req.startTime = Date.now();

  // Skip favicon noise
  if (req.originalUrl === "/favicon.ico") {
    return next();
  }

  const { method, originalUrl } = req;
  const ip =
    req.ip ||
    req.headers["x-forwarded-for"] ||
    req.connection?.remoteAddress ||
    "unknown";
  const userId = req.user?._id || "anonymous";

  // Build safe minimal headers
  const allowedHeaders = {};
  const headers = req.headers || {};
  for (const hName of Object.keys(headers)) {
    const lc = hName.toLowerCase();
    if (CONFIG.HEADER_WHITELIST.includes(lc)) {
      allowedHeaders[hName] = headers[hName];
    } else if (CONFIG.SENSITIVE_HEADERS.includes(lc)) {
      allowedHeaders[hName] = "***";
    }
  }

  logger.info("HTTP Request", {
    requestId: req.requestId,
    route: originalUrl,
    method,
    ip,
    userId,
    userAgent: req.get?.("User-Agent"),
    headers: maskSensitiveData(allowedHeaders),
    body: maskSensitiveData(req.body || {}),
    query: maskSensitiveData(req.query || {}),
    timestamp: new Date().toISOString(),
  });

  res.on("finish", () => {
    const responseTime = Date.now() - (req.startTime || Date.now());
    logger.info("HTTP Response", {
      requestId: req.requestId,
      route: req.originalUrl,
      method: req.method,
      status: res.statusCode,
      responseTime,
      userId,
      contentLength: res.get ? res.get("Content-Length") : undefined,
      timestamp: new Date().toISOString(),
    });
  });

  return next();
};

/**
 * Performance logger: warns on slow requests and optionally logs very fast ones
 */
export const performanceLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    if (duration > CONFIG.SLOW_REQUEST_THRESHOLD_MS) {
      logger.warn("Slow request detected", {
        requestId: req.requestId,
        route: req.originalUrl,
        method: req.method,
        duration,
        threshold: CONFIG.SLOW_REQUEST_THRESHOLD_MS,
        userId: req.user?._id || "anonymous",
      });
    } else if (CONFIG.ENABLE_FAST_LOGS && duration < CONFIG.FAST_REQUEST_THRESHOLD_MS) {
      logger.debug("Very fast response", {
        requestId: req.requestId,
        route: req.originalUrl,
        method: req.method,
        duration,
      });
    }
  });

  return next();
};

/**
 * Error logging middleware - should be placed after routes
 */
export const errorLogger = (err, req, res, next) => {
  try {
    if (!err || err.logged) {
      return next(err);
    }

    logger.error("HTTP Error", {
      requestId: req?.requestId || "N/A",
      message: err.message,
      stack: err.stack,
      route: req?.originalUrl,
      method: req?.method,
      ip: req?.ip,
      userId: req?.user?._id || "anonymous",
      statusCode: err.statusCode || 500,
      timestamp: new Date().toISOString(),
    });

    try {
      err.logged = true;
    } catch (e) {
      // ignore
    }
  } catch (loggingErr) {
    console.error("Failed to log error:", loggingErr);
  }

  return next(err);
};

/**
 * Security event logger with structured events
 */
export const securityLogger = {
  loginSuccess: (userId, ip, userAgent) => {
    logger.info("User login successful", maskSensitiveData({
      event: "login_success",
      userId,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    }));
  },

  loginFailed: (identifier, ip, reason, userAgent) => {
    logger.warn("User login failed", maskSensitiveData({
      event: "login_failed",
      identifier:
        typeof identifier === "string"
          ? identifier.replace(/(.{3}).+/, "$1***")
          : maskSensitiveData(identifier),
      ip,
      reason,
      userAgent,
      timestamp: new Date().toISOString(),
    }));
  },

  passwordChange: (userId, ip) => {
    logger.info("Password changed", maskSensitiveData({
      event: "password_change",
      userId,
      ip,
      timestamp: new Date().toISOString(),
    }));
  },

  unauthorizedAccess: (route, method, ip, userId) => {
    logger.warn("Unauthorized access attempt", maskSensitiveData({
      event: "unauthorized_access",
      route,
      method,
      ip,
      userId: userId || "unknown",
      timestamp: new Date().toISOString(),
    }));
  },
};

export default logger;
