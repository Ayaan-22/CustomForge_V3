// File: server/config/rateLimit.js

import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { logger } from "../middleware/logger.js";

dotenv.config();

// Helper to parse env vars with fallback
const parseEnvInt = (key, fallback) => {
  const val = parseInt(process.env[key], 10);
  return Number.isNaN(val) ? fallback : val;
};

// Generic API limiter settings (from .env)
const WINDOW_MS_API = parseEnvInt("RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000);
const MAX_API_REQ = parseEnvInt("RATE_LIMIT_MAX", 100);

// Specialized limiters (customize via .env if desired)
const WINDOW_MS_AUTH = parseEnvInt("RATE_AUTH_WINDOW_MS", WINDOW_MS_API);
const MAX_AUTH_ATTEMPTS = parseEnvInt("RATE_AUTH_MAX", 10);

const WINDOW_MS_PAYMENT = parseEnvInt("RATE_PAYMENT_WINDOW_MS", WINDOW_MS_API);
const MAX_PAYMENT_ATTEMPTS = parseEnvInt("RATE_PAYMENT_MAX", 5);

const WINDOW_MS_ADMIN = parseEnvInt("RATE_ADMIN_WINDOW_MS", WINDOW_MS_API);
const MAX_ADMIN_REQ = parseEnvInt("RATE_ADMIN_MAX", 50);

const WINDOW_MS_PUBLIC = parseEnvInt("RATE_PUBLIC_WINDOW_MS", WINDOW_MS_API);
const MAX_PUBLIC_REQ = parseEnvInt("RATE_PUBLIC_MAX", 300);

// Build a limiter config with tagged logs and Retry-After header
const buildLimiter = ({ windowMs, max, message, tag }) =>
  rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
      logger.warn(
        `[RATE:${tag}] IP=${req.ip}  PATH=${req.originalUrl}  LIMIT=${max}/${windowMs}ms`
      );
      const retryAfterSec = Math.ceil(windowMs / 1000);
      res.set("Retry-After", retryAfterSec);
      res.status(options.statusCode).json({
        status: "fail",
        message: options.message,
        retryAfter: retryAfterSec,
      });
    },
  });

// Exported limiters
export const apiLimiter = buildLimiter({
  windowMs: WINDOW_MS_API,
  max: MAX_API_REQ,
  message: "Too many requests; please try again later.",
  tag: "API",
});
export const authLimiter = buildLimiter({
  windowMs: WINDOW_MS_AUTH,
  max: MAX_AUTH_ATTEMPTS,
  message: "Too many authentication attempts; try again later.",
  tag: "AUTH",
});
export const paymentLimiter = buildLimiter({
  windowMs: WINDOW_MS_PAYMENT,
  max: MAX_PAYMENT_ATTEMPTS,
  message: "Too many payment attempts; please wait.",
  tag: "PAYMENT",
});
export const adminLimiter = buildLimiter({
  windowMs: WINDOW_MS_ADMIN,
  max: MAX_ADMIN_REQ,
  message: "Too many admin requests; please try again later.",
  tag: "ADMIN",
});
export const publicLimiter = buildLimiter({
  windowMs: WINDOW_MS_PUBLIC,
  max: MAX_PUBLIC_REQ,
  message: "Too many requests; please try again later.",
  tag: "PUBLIC",
});
