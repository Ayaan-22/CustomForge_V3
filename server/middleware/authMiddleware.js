// server/middleware/authMiddleware.js

import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import AppError from "../utils/appError.js";
import { logger } from "./logger.js";
import { verify2FAToken } from "../utils/generateToken.js";
import User from "../models/User.js";

/**
 * Middleware to protect routes (Only authenticated users can access)
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Extract token from headers, cookies, or query params
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.jwt) {
    token = req.cookies.jwt;
  } else if (req.query?.token) {
    // ⚠️ Recommended: limit this usage to specific flows like email verification
    token = req.query.token;
  }

  if (!token) {
    logger.warn("Unauthorized access attempt - no token", {
      ip: req.ip,
      route: req.originalUrl,
    });
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const currentUser = await User.findById(decoded.userId).select(
      "+passwordChangedAt +isActive"
    );

    if (!currentUser) {
      logger.warn(`Access attempt with invalid user ID: ${decoded.userId}`);
      return next(
        new AppError("The user belonging to this token no longer exists.", 401)
      );
    }

    // Block inactive / soft-deleted accounts
    if (currentUser.isActive === false) {
      logger.warn(`Inactive user attempted access: ${currentUser.email}`);
      return next(
        new AppError(
          "This account has been deactivated. Please contact support.",
          403
        )
      );
    }

    // Check if password was changed after token issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      logger.warn(
        `Password changed after token issued for user: ${currentUser.email}`
      );
      return next(
        new AppError(
          "User recently changed password! Please log in again.",
          401
        )
      );
    }

    req.user = currentUser;
    res.locals.user = currentUser;
    logger.info(`User authenticated: ${currentUser.email}`);
    next();
  } catch (err) {
    logger.error(`JWT verification failed: ${err.message}`, {
      route: req.originalUrl,
      ip: req.ip,
    });
    return next(new AppError("Invalid token. Please log in again.", 401));
  }
});

/**
 * Middleware to restrict access to specific user roles
 */
const restrictTo = (...roles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError("Not authenticated", 401));
    }
    if (!roles.includes(req.user.role)) {
      logger.warn(
        `Unauthorized role access attempt by ${req.user.email} (role: ${req.user.role})`
      );
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    logger.info(`Role access granted to ${req.user.email} (${req.user.role})`);
    next();
  };
};

/**
 * Middleware to ensure user has verified email
 */
const verifiedEmail = asyncHandler(async (req, _res, next) => {
  if (!req.user?.isEmailVerified) {
    logger.warn(`Unverified email access attempt by ${req.user?.email}`, {
      userId: req.user?._id,
    });
    return next(
      new AppError(
        "Please verify your email address to access this resource",
        403
      )
    );
  }
  next();
});

/**
 * Middleware for two-factor authentication verification
 */
const twoFactorAuth = asyncHandler(async (req, _res, next) => {
  if (!req.user?.twoFactorEnabled || !req.user.twoFactorSecret) return next();

  const twoFactorToken = req.headers["x-2fa-token"] || req.body.twoFactorToken;

  if (!twoFactorToken) {
    logger.warn(`2FA token missing for user: ${req.user.email}`);
    return next(new AppError("Two-factor authentication token required", 401));
  }

  const verified = verify2FAToken(req.user.twoFactorSecret, twoFactorToken);

  if (!verified) {
    logger.warn(`Invalid 2FA token for user: ${req.user.email}`);
    return next(new AppError("Invalid two-factor authentication token", 401));
  }

  logger.info(`2FA verified for user: ${req.user.email}`);
  next();
});

// Export all middleware functions
export { protect, restrictTo, verifiedEmail, twoFactorAuth };
