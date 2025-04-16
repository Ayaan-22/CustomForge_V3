import rateLimit from 'express-rate-limit';
import { logger } from '../middleware/logger.js';

// Common rate limit configuration
const commonConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable legacy headers
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.originalUrl}`);
    res.status(options.statusCode).json({
      status: 'fail',
      message: options.message,
      retryAfter: options.windowMs / 1000
    });
  }
};

// API rate limiter
export const apiLimiter = rateLimit({
  ...commonConfig,
  max: 200, // Limit each IP to 200 requests per window
  message: 'Too many API requests from this IP, please try again later'
});

// Authentication rate limiter (stricter)
export const authLimiter = rateLimit({
  ...commonConfig,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many authentication attempts, please try again after an hour'
});

// Payment rate limiter (very strict)
export const paymentLimiter = rateLimit({
  ...commonConfig,
  max: 5,
  message: 'Too many payment attempts, please try again later'
});

// Admin endpoints rate limiter
export const adminLimiter = rateLimit({
  ...commonConfig,
  max: 50,
  message: 'Too many admin requests, please try again later'
});

// Public endpoints rate limiter (more lenient)
export const publicLimiter = rateLimit({
  ...commonConfig,
  max: 300,
  message: 'Too many requests, please try again later'
});