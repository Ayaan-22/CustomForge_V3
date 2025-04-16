import User from '../models/User.js';
import AppError from '../utils/appError.js';
import asyncHandler from 'express-async-handler';
import speakeasy from 'speakeasy';

/**
 * @desc    Filter object to only include allowed fields
 */
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

/**
 * @desc    Get all users (Admin only)
 * @route   GET /api/users
 * @access  Private/Admin
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password -twoFactorSecret');

  res.status(200).json({
    success: true,
    results: users.length,
    data: users
  });
});

/**
 * @desc    Get current user profile
 * @route   GET /api/users/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select('-password -twoFactorSecret')
    .populate('wishlist', 'name image finalPrice');

  res.status(200).json({
    success: true,
    data: user
  });
});

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
export const getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-password -twoFactorSecret');

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

/**
 * @desc    Update current user profile
 * @route   PATCH /api/users/me
 * @access  Private
 */
export const updateMe = asyncHandler(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /update-password.',
        400
      )
    );
  }

  // 2) Filter out unwanted fields
  const filteredBody = filterObj(req.body, 'name', 'email', 'avatar', 'phone', 'address');

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  }).select('-password -twoFactorSecret');

  res.status(200).json({
    success: true,
    data: updatedUser
  });
});

/**
 * @desc    Deactivate current user account
 * @route   DELETE /api/users/me
 * @access  Private
 */
export const deleteMe = asyncHandler(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    success: true,
    data: null
  });
});

/**
 * @desc    Update user (Admin only)
 * @route   PATCH /api/users/:id
 * @access  Private/Admin
 */
export const updateUser = asyncHandler(async (req, res, next) => {
  // 1) Prevent password updates
  if (req.body.password) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /update-password.',
        400
      )
    );
  }

  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).select('-password -twoFactorSecret');

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

/**
 * @desc    Delete user (Admin only)
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
export const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(204).json({
    success: true,
    data: null
  });
});

/**
 * @desc    Get user's wishlist
 * @route   GET /api/users/wishlist
 * @access  Private
 */
export const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate('wishlist', 'name image finalPrice category');

  res.status(200).json({
    success: true,
    data: user.wishlist
  });
});

/**
 * @desc    Get user's orders
 * @route   GET /api/users/orders
 * @access  Private
 */
export const getUserOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user.id })
    .sort('-createdAt')
    .select('-user');

  res.status(200).json({
    success: true,
    results: orders.length,
    data: orders
  });
});

/**
 * @desc    Setup two-factor authentication
 * @route   POST /api/users/2fa/setup
 * @access  Private
 */
export const setupTwoFactor = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (user.twoFactorEnabled) {
    return next(new AppError('Two-factor authentication is already enabled', 400));
  }

  const secret = speakeasy.generateSecret({
    name: `GameStore (${user.email})`
  });

  user.twoFactorSecret = secret.base32;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    data: {
      otpauthUrl: secret.otpauth_url,
      secret: secret.base32
    }
  });
});

/**
 * @desc    Verify two-factor authentication setup
 * @route   POST /api/users/2fa/verify
 * @access  Private
 */
export const verifyTwoFactor = asyncHandler(async (req, res, next) => {
  const { token } = req.body;
  const user = await User.findById(req.user.id);

  if (!user.twoFactorSecret) {
    return next(new AppError('Two-factor authentication is not set up', 400));
  }

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token
  });

  if (!verified) {
    return next(new AppError('Invalid verification code', 400));
  }

  user.twoFactorEnabled = true;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Two-factor authentication enabled successfully'
  });
});

/**
 * @desc    Disable two-factor authentication
 * @route   DELETE /api/users/2fa/disable
 * @access  Private
 */
export const disableTwoFactor = asyncHandler(async (req, res, next) => {
  const { token } = req.body;
  const user = await User.findById(req.user.id);

  if (!user.twoFactorEnabled) {
    return next(new AppError('Two-factor authentication is not enabled', 400));
  }

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token
  });

  if (!verified) {
    return next(new AppError('Invalid verification code', 400));
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Two-factor authentication disabled successfully'
  });
});