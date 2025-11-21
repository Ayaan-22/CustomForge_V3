// server/controllers/userController.js

import User from "../models/User.js";
import Order from "../models/Order.js";
import asyncHandler from "express-async-handler";
import AppError from "../utils/appError.js";
import { logger } from "../middleware/logger.js";

/**
 * Utility: Filter object fields for safe update
 */
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  if (!obj || typeof obj !== "object") return newObj;

  Object.keys(obj).forEach((key) => {
    if (allowedFields.includes(key)) {
      newObj[key] = obj[key];
    }
  });

  return newObj;
};

/**
 * @desc    Get logged-in user's profile
 * @route   GET /api/users/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .select("-password -twoFactorSecret")
    .populate("wishlist", "name image finalPrice category");

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    success: true,
    data: user,
  });

  logger.info("Fetched profile", { userId: req.user.id });
});

/**
 * @desc    Update current user's profile (non-sensitive fields only)
 * @route   PATCH /api/users/me
 * @access  Private
 */
export const updateMe = asyncHandler(async (req, res, next) => {
  logger.info("Update self start", {
    userId: req.user.id,
    bodyKeys: Object.keys(req.body || {}),
  });

  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError("This route is not for password updates", 400));
  }

  // Only allow safe profile fields here (email updates should be a dedicated, verified flow)
  const filteredBody = filterObj(
    req.body,
    "name",
    "avatar",
    "phone",
    "address"
  );

  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  Object.assign(user, filteredBody);

  await user.save();

  res.status(200).json({
    success: true,
    data: user, // toJSON() on model removes sensitive fields
  });

  logger.info("Updated self", { userId: req.user.id });
});

/**
 * @desc    Deactivate (soft-delete) current user
 * @route   DELETE /api/users/me
 * @access  Private
 */
export const deleteMe = asyncHandler(async (req, res, next) => {
  logger.info("Deactivate self start", { userId: req.user.id });

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { active: false },
    { new: true }
  );

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  res.status(204).json({
    success: true,
    data: null,
  });

  logger.info("Deactivated self", { userId: req.user.id });
});

/**
 * @desc    Get user's wishlist
 * @route   GET /api/users/wishlist
 * @access  Private
 */
export const getWishlist = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate(
    "wishlist",
    "name image finalPrice category"
  );

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    success: true,
    results: user.wishlist.length,
    data: user.wishlist,
  });

  logger.info("Fetched user wishlist", {
    userId: req.user.id,
    results: user.wishlist.length,
  });
});

/**
 * @desc    Get logged-in user's orders
 * @route   GET /api/users/orders
 * @access  Private
 */
export const getUserOrders = asyncHandler(async (req, res, next) => {
  const orders = await Order.find({ user: req.user.id })
    .sort("-createdAt")
    .select("-user");

  res.status(200).json({
    success: true,
    results: orders.length,
    data: orders,
  });

  logger.info("Fetched user orders", {
    userId: req.user.id,
    results: orders.length,
  });
});
