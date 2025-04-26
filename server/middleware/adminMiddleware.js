// File: server/middleware/adminMiddleware.js
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import { logger } from './logger.js';
import AppError from '../utils/appError.js';

/**
 * Middleware to verify admin access
 */
const isAdmin = asyncHandler(async (req, res, next) => {
  // 1) Check if user is logged in
  if (!req.user) {
    logger.warn('Unauthorized admin access attempt - no user');
    return next(new AppError('Please log in to access this resource', 401));
  }

  // 2) Check if user has admin privileges
  const user = await User.findById(req.user._id);
  if (!user || user.role !== 'admin') {
    logger.warn(`Unauthorized admin access attempt by ${req.user._id}`);
    return next(
      new AppError('You do not have permission to perform this action', 403)
    );
  }

  // 3) Log admin access
  logger.info(`Admin access granted to ${user.email}`);
  next();
});

/**
 * Middleware to verify publisher access
 */
const isPublisher = asyncHandler(async (req, res, next) => {
  // 1) Check if user is logged in
  if (!req.user) {
    logger.warn('Unauthorized publisher access attempt - no user');
    return next(new AppError('Please log in to access this resource', 401));
  }

  // 2) Check if user has publisher or admin privileges
  const user = await User.findById(req.user._id);
  if (!user || (user.role !== 'publisher' && user.role !== 'admin')) {
    logger.warn(`Unauthorized publisher access attempt by ${req.user._id}`);
    return next(
      new AppError('You do not have permission to perform this action', 403)
    );
  }

  // 3) Additional publisher-specific checks
  if (user.role === 'publisher') {
    if (!user.isPublisherApproved) {
      logger.warn(`Publisher not approved: ${user.email}`);
      return next(
        new AppError('Your publisher account is pending approval', 403)
      );
    }
  }

  logger.info(`Publisher access granted to ${user.email}`);
  next();
});

// Export the middleware functions
export { isAdmin, isPublisher };