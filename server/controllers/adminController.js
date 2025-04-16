import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import AppError from '../utils/appError.js';
import asyncHandler from 'express-async-handler';

/**
 * @desc    Get all users with pagination
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const users = await User.find()
    .select('-password -twoFactorSecret')
    .skip(skip)
    .limit(limit);
  
  const count = await User.countDocuments();

  res.json({
    success: true,
    count,
    page,
    pages: Math.ceil(count / limit),
    data: users
  });
});

/**
 * @desc    Get user by ID
 * @route   GET /api/admin/users/:id
 * @access  Private/Admin
 */
export const getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select('-password -twoFactorSecret');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.json({
    success: true,
    data: user
  });
});

/**
 * @desc    Delete user
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
export const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Prevent admin from deleting themselves
  if (user._id.toString() === req.user.id) {
    return next(new AppError('You cannot delete your own admin account', 400));
  }

  await user.deleteOne();
  res.json({ success: true, data: {} });
});

/**
 * @desc    Get sales analytics
 * @route   GET /api/admin/analytics/sales
 * @access  Private/Admin
 */
export const getSalesAnalytics = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  const salesData = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
        isPaid: true
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        totalSales: { $sum: "$totalPrice" },
        numOrders: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.json({
    success: true,
    data: salesData
  });
});

/**
 * @desc    Get product statistics by category
 * @route   GET /api/admin/analytics/products
 * @access  Private/Admin
 */
export const getProductStats = asyncHandler(async (req, res) => {
  const stats = await Product.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        avgPrice: { $avg: '$finalPrice' },
        minPrice: { $min: '$finalPrice' },
        maxPrice: { $max: '$finalPrice' }
      }
    }
  ]);

  res.json({
    success: true,
    data: stats
  });
});