// server/controllers/userController.js

import User from "../models/User.js";
import Order from "../models/Order.js";
import asyncHandler from "express-async-handler";
import AppError from "../utils/appError.js";

/**
 * Utility: Filter object fields for safe update
 */
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((key) => {
    if (allowedFields.includes(key)) {
      newObj[key] = obj[key];
    }
  });
  return newObj;
};

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Private/Admin
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password -twoFactorSecret");

  res.status(200).json({
    success: true,
    results: users.length,
    data: users,
  });
});

/**
 * @desc    Get logged-in user's profile
 * @route   GET /api/users/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select("-password -twoFactorSecret")
    .populate("wishlist", "name image finalPrice category");

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
export const getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).select(
    "-password -twoFactorSecret"
  );

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Update current user's profile
 * @route   PATCH /api/users/me
 * @access  Private
 */
export const updateMe = asyncHandler(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError("This route is not for password updates", 400));
  }

  const filteredBody = filterObj(
    req.body,
    "name",
    "email",
    "avatar",
    "phone",
    "address"
  );

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  }).select("-password -twoFactorSecret");

  res.status(200).json({
    success: true,
    data: updatedUser,
  });
});

/**
 * @desc    Deactivate (soft-delete) current user
 * @route   DELETE /api/users/me
 * @access  Private
 */
export const deleteMe = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    success: true,
    data: null,
  });
});

/**
 * @desc    Update user by Admin
 * @route   PATCH /api/users/:id
 * @access  Private/Admin
 */
export const updateUser = asyncHandler(async (req, res, next) => {
  if (req.body.password) {
    return next(new AppError("Use the proper route for password updates", 400));
  }

  const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).select("-password -twoFactorSecret");

  if (!updatedUser) {
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    success: true,
    data: updatedUser,
  });
});

/**
 * @desc    Delete user by Admin
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
export const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  res.status(204).json({
    success: true,
    data: null,
  });
});

/**
 * @desc    Get user's wishlist
 * @route   GET /api/users/wishlist
 * @access  Private
 */
export const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate(
    "wishlist",
    "name image finalPrice category"
  );

  res.status(200).json({
    success: true,
    results: user.wishlist.length,
    data: user.wishlist,
  });
});

/**
 * @desc    Get logged-in user's orders
 * @route   GET /api/users/orders
 * @access  Private
 */
export const getUserOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user.id })
    .sort("-createdAt")
    .select("-user");

  res.status(200).json({
    success: true,
    results: orders.length,
    data: orders,
  });
});
