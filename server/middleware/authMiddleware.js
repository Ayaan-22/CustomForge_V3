// server/middleware/authMiddleware.js

import asyncHandler from "express-async-handler";
import AppError from "../utils/appError.js";
import { logger } from "./logger.js";
import { verify2FAToken, verifyJWT } from "../utils/generateToken.js";
import User from "../models/User.js";

/* =======================================================================================
   PROTECT – Authenticates user using JWT (from Authorization header or cookies)
   ======================================================================================= */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1) Extract JWT safely (query parameters NOT allowed anymore)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    logger.warn("Unauthorized access attempt - no token", {
      route: req.originalUrl,
      ip: req.ip,
    });
    return next(
      new AppError("You are not logged in. Please log in to get access.", 401)
    );
  }

  // 2) Verify token properly using centralized function
  let decoded;
  try {
    decoded = verifyJWT(token); // << SAFE, validated, restricted algorithms
  } catch (err) {
    logger.error(`JWT verification failed: ${err.message}`, {
      route: req.originalUrl,
      ip: req.ip,
    });
    return next(new AppError("Invalid or expired token. Please log in again.", 401));
  }

  // 3) Check if the user still exists
  const currentUser = await User.findById(decoded.userId).select(
    "+passwordChangedAt +active +twoFactorEnabled +twoFactorSecret"
  );

  if (!currentUser) {
    logger.warn("Token used for non-existing user", { userId: decoded.userId });
    return next(
      new AppError(
        "The user belonging to this token no longer exists.",
        401
      )
    );
  }

  // 4) Block inactive accounts
  if (currentUser.active === false) {
    logger.warn("Inactive user attempted access", { email: currentUser.email });
    return next(
      new AppError(
        "This account has been deactivated. Please contact support.",
        403
      )
    );
  }

  // 5) If user changed password after token issued → block token
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    logger.warn("Token rejected: password changed after issue", {
      email: currentUser.email,
    });
    return next(
      new AppError(
        "Your password was recently changed. Please log in again.",
        401
      )
    );
  }

  // 6) Attach user to request for use in next middlewares/controllers
  req.user = currentUser;
  res.locals.user = currentUser;

  logger.info("User authenticated", {
    email: currentUser.email,
    route: req.originalUrl,
  });

  next();
});

/* =======================================================================================
   RESTRICT-TO – Authorize based on role
   ======================================================================================= */
export const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn("Unauthorized role access", {
        email: req.user.email,
        attemptedRole: req.user.role,
      });

      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }

    logger.info("Role access granted", {
      email: req.user.email,
      role: req.user.role,
    });

    next();
  };
};

/* =======================================================================================
   VERIFIED EMAIL – Allow only verified users
   ======================================================================================= */
export const verifiedEmail = asyncHandler(async (req, res, next) => {
  if (!req.user?.isEmailVerified) {
    logger.warn("Unverified user attempted access", {
      email: req.user?.email,
      userId: req.user?._id,
    });
    return next(
      new AppError(
        "Please verify your email address to access this resource.",
        403
      )
    );
  }
  next();
});

/* =======================================================================================
   TWO-FACTOR AUTH – Require 2FA for selected routes (NOT at login time)
   ======================================================================================= */
export const twoFactorAuth = asyncHandler(async (req, res, next) => {
  // If user doesn't have 2FA enabled → allow access
  if (!req.user?.twoFactorEnabled || !req.user.twoFactorSecret) {
    return next();
  }

  // Extract 2FA token
  const twoFactorToken =
    req.headers["x-2fa-token"] || req.body.twoFactorToken;

  if (!twoFactorToken) {
    logger.warn("Missing 2FA token", { email: req.user.email });
    return next(
      new AppError("Two-factor authentication token is required.", 401)
    );
  }

  // Verify token
  const verified = verify2FAToken(req.user.twoFactorSecret, twoFactorToken);

  if (!verified) {
    logger.warn("Invalid 2FA token", { email: req.user.email });
    return next(
      new AppError("Invalid two-factor authentication token.", 401)
    );
  }

  logger.info("2FA verified", { email: req.user.email });
  next();
});
