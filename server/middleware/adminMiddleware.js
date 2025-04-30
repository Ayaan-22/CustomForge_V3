// File: server/middleware/adminMiddleware.js

import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import { logger } from "./logger.js";
import AppError from "../utils/appError.js";

const ROLES = {
  ADMIN: "admin",
  PUBLISHER: "publisher",
};

/**
 * Middleware to verify admin access
 */
export const isAdmin = asyncHandler(async (req, res, next) => {
  // User is already authenticated by protect middleware
  const userId = req.user._id;

  const user = await User.findById(userId).select("role email").lean();

  if (!user || user.role !== ROLES.ADMIN) {
    logger.warn(`[AUTH:ADMIN] Unauthorized admin access by user ${userId}`);
    throw AppError.forbidden(
      "You do not have permission to perform this action"
    );
  }

  // Attach fresh user data for downstream handlers
  req.user = user;

  logger.info(`[AUTH:ADMIN] Admin access granted to ${user.email}`);
  next();
});

/**
 * Middleware to verify publisher access
 */
export const isPublisher = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  const user = await User.findById(userId)
    .select("role isPublisherApproved email")
    .lean();

  if (!user || (user.role !== ROLES.PUBLISHER && user.role !== ROLES.ADMIN)) {
    logger.warn(
      `[AUTH:PUBLISHER] Unauthorized publisher access by user ${userId}`
    );
    throw AppError.forbidden(
      "You do not have permission to perform this action"
    );
  }

  if (user.role === ROLES.PUBLISHER && !user.isPublisherApproved) {
    logger.warn(`[AUTH:PUBLISHER] Publisher not approved: ${user.email}`);
    throw AppError.forbidden("Your publisher account is pending approval");
  }

  req.user = user;

  logger.info(`[AUTH:PUBLISHER] Publisher access granted to ${user.email}`);
  next();
});
