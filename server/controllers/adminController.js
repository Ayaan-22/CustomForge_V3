// server/controllers/adminController.js

import mongoose from "mongoose";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Review from "../models/Review.js";
import Coupon from "../models/Coupon.js";
import AppError from "../utils/appError.js";
import asyncHandler from "express-async-handler";
import { logger } from "../middleware/logger.js";
import cloudinary from "../utils/cloudinary.js";
import streamifier from "streamifier";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate and sanitize pagination parameters
 */
const validatePagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Escape regex special characters to prevent ReDoS / injection
 */
const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Build search query for text fields (safe regex)
 */
const buildSearchQuery = (searchTerm, searchFields) => {
  if (!searchTerm) return {};

  const safe = escapeRegex(searchTerm);
  const regex = new RegExp(safe, "i");

  return {
    $or: searchFields.map((field) => ({
      [field]: regex,
    })),
  };
};

/**
 * Validate and build sort object
 */
const buildSortObject = (
  sortBy,
  sortOrder,
  validFields,
  defaultSort = { createdAt: -1 }
) => {
  const sort = {};
  const order = sortOrder === "asc" ? 1 : -1;

  if (validFields.includes(sortBy)) {
    sort[sortBy] = order;
  } else {
    Object.assign(sort, defaultSort);
  }

  return sort;
};

/**
 * Validate date range
 */
const validateDateRange = (startDate, endDate, maxDays = 365) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new AppError("Invalid date format", 400);
  }

  if (start > end) {
    throw new AppError("Start date must be before end date", 400);
  }

  if (start > now) {
    throw new AppError("Start date cannot be in the future", 400);
  }

  const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
  if (daysDiff > maxDays) {
    throw new AppError(`Date range cannot exceed ${maxDays} days`, 400);
  }

  return { start, end };
};

// ============================================================================
// ANALYTICS & DASHBOARD
// ============================================================================

/**
 * @desc    Get comprehensive sales analytics
 * @route   GET /api/admin/analytics/sales
 * @access  Private/Admin
 */
export const getSalesAnalytics = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Admin access only", 403));
  }

  const validPeriods = ["daily", "weekly", "monthly"];
  const requestedPeriod = req.query.period;
  const period = validPeriods.includes(requestedPeriod)
    ? requestedPeriod
    : "daily";

  let days = parseInt(req.query.days, 10);
  if (Number.isNaN(days) || days <= 0) days = 30;
  days = Math.min(Math.max(days, 1), 365);

  let groupBy;
  switch (period) {
    case "weekly":
      groupBy = {
        year: { $year: "$createdAt" },
        week: { $isoWeek: "$createdAt" },
      };
      break;
    case "monthly":
      groupBy = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
      };
      break;
    default:
      groupBy = {
        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
      };
  }

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [salesData, topProducts, customerStats] = await Promise.all([
    // Sales trend data
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          isPaid: true,
        },
      },
      {
        $group: {
          _id: groupBy,
          totalSales: { $sum: "$totalPrice" },
          numOrders: { $sum: 1 },
          avgOrderValue: { $avg: "$totalPrice" },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Top selling products
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          isPaid: true,
        },
      },
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.product",
          productName: { $first: "$orderItems.name" },
          totalSold: { $sum: "$orderItems.quantity" },
          totalRevenue: {
            $sum: {
              $multiply: ["$orderItems.price", "$orderItems.quantity"],
            },
          },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
    ]),

    // Customer statistics
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          isPaid: true,
        },
      },
      {
        $group: {
          _id: null,
          totalCustomers: { $addToSet: "$user" },
          totalRevenue: { $sum: "$totalPrice" },
          avgOrderValue: { $avg: "$totalPrice" },
        },
      },
    ]),
  ]);

  const cs = customerStats[0] || {
    totalCustomers: [],
    totalRevenue: 0,
    avgOrderValue: 0,
  };

  res.json({
    success: true,
    data: {
      salesTrend: salesData,
      topProducts,
      customerStats: {
        totalCustomers: Array.isArray(cs.totalCustomers)
          ? cs.totalCustomers.length
          : cs.totalCustomers || 0,
        totalRevenue: cs.totalRevenue || 0,
        avgOrderValue: cs.avgOrderValue || 0,
      },
      period,
      days,
    },
  });
  logger.info("Admin fetched comprehensive sales analytics", { days, period });
});

/**
 * @desc    Get product statistics grouped by category
 * @route   GET /api/admin/analytics/products
 * @access  Private/Admin
 */
export const getProductStats = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Admin access only", 403));
  }

  const stats = await Product.aggregate([
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
        avgPrice: { $avg: "$finalPrice" },
        minPrice: { $min: "$finalPrice" },
        maxPrice: { $max: "$finalPrice" },
      },
    },
  ]);

  res.json({ success: true, data: stats });
  logger.info("Admin fetched product stats", { groups: stats.length });
});

/**
 * @desc    Get dashboard overview statistics
 * @route   GET /api/admin/analytics/overview
 * @access  Private/Admin
 */
export const getDashboardOverview = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Admin access only", 403));
  }

  const { period = "30d" } = req.query;

  // Calculate date range based on period
  let days;
  switch (period) {
    case "7d":
      days = 7;
      break;
    case "30d":
      days = 30;
      break;
    case "90d":
      days = 90;
      break;
    case "1y":
      days = 365;
      break;
    default:
      days = 30;
  }

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const previousPeriodStart = new Date(
    Date.now() - days * 2 * 24 * 60 * 60 * 1000
  );

  const [currentPeriodStats, previousPeriodStats, userStats, productStats, recentOrders] =
    await Promise.all([
      // Current period stats
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            isPaid: true,
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalPrice" },
            totalOrders: { $sum: 1 },
            avgOrderValue: { $avg: "$totalPrice" },
            uniqueCustomers: { $addToSet: "$user" },
          },
        },
      ]),

      // Previous period stats for comparison
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: previousPeriodStart, $lt: startDate },
            isPaid: true,
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalPrice" },
            totalOrders: { $sum: 1 },
            avgOrderValue: { $avg: "$totalPrice" },
            uniqueCustomers: { $addToSet: "$user" },
          },
        },
      ]),

      // User statistics
      User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            activeUsers: {
              $sum: {
                $cond: [{ $ne: ["$active", false] }, 1, 0],
              },
            },
            newUsers: {
              $sum: {
                $cond: [{ $gte: ["$createdAt", startDate] }, 1, 0],
              },
            },
          },
        },
      ]),

      // Product statistics
      Product.aggregate([
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            activeProducts: {
              $sum: {
                $cond: [{ $eq: ["$isActive", true] }, 1, 0],
              },
            },
            lowStockProducts: {
              $sum: {
                $cond: [{ $lte: ["$stock", 10] }, 1, 0],
              },
            },
            outOfStockProducts: {
              $sum: {
                $cond: [{ $eq: ["$stock", 0] }, 1, 0],
              },
            },
          },
        },
      ]),

      // Recent orders
      Order.find({ isPaid: true })
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .limit(5)
        .select("totalPrice createdAt orderItems user")
        .lean(),
    ]);

  const current =
    currentPeriodStats[0] || {
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderValue: 0,
      uniqueCustomers: [],
    };
  const previous =
    previousPeriodStats[0] || {
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderValue: 0,
      uniqueCustomers: [],
    };
  const users =
    userStats[0] || {
      totalUsers: 0,
      activeUsers: 0,
      newUsers: 0,
    };
  const products =
    productStats[0] || {
      totalProducts: 0,
      activeProducts: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
    };

  // Calculate growth percentages
  const revenueGrowth =
    previous.totalRevenue > 0
      ? (
          ((current.totalRevenue - previous.totalRevenue) /
            previous.totalRevenue) *
          100
        ).toFixed(1)
      : 0;

  const ordersGrowth =
    previous.totalOrders > 0
      ? (
          ((current.totalOrders - previous.totalOrders) /
            previous.totalOrders) *
          100
        ).toFixed(1)
      : 0;

  res.json({
    success: true,
    data: {
      period,
      revenue: {
        current: current.totalRevenue,
        previous: previous.totalRevenue,
        growth: parseFloat(revenueGrowth),
        avgOrderValue: Math.round(current.avgOrderValue || 0),
      },
      orders: {
        current: current.totalOrders,
        previous: previous.totalOrders,
        growth: parseFloat(ordersGrowth),
      },
      customers: {
        current: current.uniqueCustomers.length,
        previous: previous.uniqueCustomers.length,
      },
      users: {
        total: users.totalUsers,
        active: users.activeUsers,
        new: users.newUsers,
      },
      products: {
        total: products.totalProducts,
        active: products.activeProducts,
        lowStock: products.lowStockProducts,
        outOfStock: products.outOfStockProducts,
      },
      recentOrders,
    },
  });

  logger.info("Admin fetched dashboard overview", { period, days });
});

/**
 * @desc    Get inventory analytics
 * @route   GET /api/admin/analytics/inventory
 * @access  Private/Admin
 */
export const getInventoryAnalytics = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Admin access only", 403));
  }

  const [stockLevels, categoryStock, lowStockProducts, topSellingProducts] =
    await Promise.all([
      // Stock level distribution
      Product.aggregate([
        {
          $group: {
            _id: null,
            totalStock: { $sum: "$stock" },
            avgStock: { $avg: "$stock" },
            outOfStock: {
              $sum: {
                $cond: [{ $eq: ["$stock", 0] }, 1, 0],
              },
            },
            lowStock: {
              $sum: {
                $cond: [
                  { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", 10] }] },
                  1,
                  0,
                ],
              },
            },
            inStock: {
              $sum: {
                $cond: [{ $gt: ["$stock", 10] }, 1, 0],
              },
            },
          },
        },
      ]),

      // Stock by category
      Product.aggregate([
        {
          $group: {
            _id: "$category",
            totalStock: { $sum: "$stock" },
            productCount: { $sum: 1 },
            avgStock: { $avg: "$stock" },
            lowStockCount: {
              $sum: {
                $cond: [{ $lte: ["$stock", 10] }, 1, 0],
              },
            },
          },
        },
        { $sort: { totalStock: -1 } },
      ]),

      // Low stock products
      Product.find({
        stock: { $lte: 10, $gt: 0 },
        isActive: true,
      })
        .select("name category stock sku")
        .sort({ stock: 1 })
        .limit(20)
        .lean(),

      // Top selling products (based on salesCount)
      Product.find({ isActive: true })
        .select("name category salesCount stock")
        .sort({ salesCount: -1 })
        .limit(10)
        .lean(),
    ]);

  res.json({
    success: true,
    data: {
      stockLevels:
        stockLevels[0] || {
          totalStock: 0,
          avgStock: 0,
          outOfStock: 0,
          lowStock: 0,
          inStock: 0,
        },
      categoryStock,
      lowStockProducts,
      topSellingProducts,
    },
  });

  logger.info("Admin fetched inventory analytics");
});

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * @desc    Create new user (Admin only)
 * @route   POST /api/admin/users
 * @access  Private/Admin
 */
export const createUser = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Admin access only", 403));
  }

  logger.info("Admin create user start", {
    adminId: req.user?.id,
    bodyKeys: Object.keys(req.body || {}),
  });

  const {
    name,
    email,
    password,
    role = "user",
    phone,
    address,
    isActive = true, // incoming flag; mapped to `active` field
  } = req.body;

  const validationErrors = [];

  // Required fields validation
  if (!name?.trim()) validationErrors.push("Name is required");
  if (!email?.trim()) validationErrors.push("Email is required");
  if (!password?.trim()) validationErrors.push("Password is required");

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    validationErrors.push("Invalid email format");
  }

  // Password validation (User model enforces min 8, but we show early)
  if (password && password.length < 8) {
    validationErrors.push("Password must be at least 8 characters long");
  }

  // Role validation
  const validRoles = ["user", "admin"];
  if (role && !validRoles.includes(role)) {
    validationErrors.push("Invalid role. Must be 'user' or 'admin'");
  }

  // Return all validation errors at once
  if (validationErrors.length > 0) {
    return next(new AppError(validationErrors.join("; "), 400));
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return next(new AppError("User with this email already exists", 400));
  }

  const activeFlag =
    typeof isActive === "string"
      ? isActive === "true"
      : Boolean(isActive ?? true);

  // Create user
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    role,
    phone: phone?.trim(),
    address,
    active: activeFlag,
    isEmailVerified: false, // Admin-created users still need to verify email
  });

  // Remove sensitive data from response
  const userResponse = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    address: user.address,
    isActive: user.active,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
  };

  res.status(201).json({
    success: true,
    message: "User created successfully",
    data: userResponse,
  });
  logger.info("Admin created user", {
    userId: user._id,
    email: user.email,
    role: user.role,
    adminId: req.user?.id,
  });
});

/**
 * @desc    Get all users (paginated with advanced filtering)
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
export const getAllUsers = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Admin access only", 403));
  }

  logger.info("Admin fetch users", {
    route: req.originalUrl,
    method: req.method,
    adminId: req.user?.id,
    query: req.query,
  });

  const { page, limit, skip } = validatePagination(req.query);

  const query = {};
  const { search, role, isActive, sortBy = "createdAt", sortOrder = "desc" } =
    req.query;

  // Search functionality
  if (search) {
    const safe = escapeRegex(search);
    const regex = new RegExp(safe, "i");
    query.$or = [{ name: regex }, { email: regex }];
  }

  // Filter by role
  if (role && ["user", "admin"].includes(role)) {
    query.role = role;
  }

  // Filter by active status (User schema uses `active`)
  if (typeof isActive === "string") {
    if (isActive === "true") {
      query.active = true;
    } else if (isActive === "false") {
      query.active = false;
    }
    // If not provided, pre('find') will keep only active != false
  }

  // Build sort object
  const sort = {};
  const validSortFields = ["name", "email", "createdAt", "lastLoginAt"];
  if (validSortFields.includes(sortBy)) {
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;
  } else {
    sort.createdAt = -1; // Default sort
  }

  const users = await User.find(query)
    .select("-password -twoFactorSecret")
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  const count = await User.countDocuments(query);

  res.json({
    success: true,
    count,
    page,
    pages: Math.ceil(count / limit),
    data: users,
    filters: { search, role, isActive, sortBy, sortOrder },
  });
  logger.info("Admin fetched users", { count, page, limit, filters: req.query });
});

/**
 * @desc    Get a user by ID
 * @route   GET /api/admin/users/:id
 * @access  Private/Admin
 */
export const getUserById = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Admin access only", 403));
  }

  const user = await User.findById(req.params.id).select(
    "-password -twoFactorSecret"
  );

  if (!user) {
    logger.warn("Admin user not found", { id: req.params.id });
    return next(new AppError("User not found", 404));
  }

  res.json({ success: true, data: user });
  logger.info("Admin fetched user", { id: req.params.id });
});

/**
 * @desc    Update user by Admin
 * @route   PATCH /api/admin/users/:id
 * @access  Private/Admin
 */
export const updateUser = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Admin access only", 403));
  }

  logger.info("Update user start", {
    id: req.params.id,
    bodyKeys: Object.keys(req.body || {}),
  });

  if (req.body.password) {
    return next(new AppError("Use the proper route for password updates", 400));
  }

  // Only allow safe fields to be updated
  const allowedFields = ["name", "email", "role", "phone", "address", "active"];
  const updateData = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  }).select("-password -twoFactorSecret");

  if (!updatedUser) {
    logger.warn("User not found for update", { id: req.params.id });
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    success: true,
    data: updatedUser,
  });
  logger.info("Updated user", { id: req.params.id });
});

/**
 * @desc    Soft-delete (deactivate) a user
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
export const deleteUser = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Admin access only", 403));
  }

  logger.info("Admin delete user start", {
    id: req.params.id,
    adminId: req.user?.id,
  });

  const user = await User.findById(req.params.id).select("+active");

  if (!user) {
    logger.warn("Admin user not found for delete", { id: req.params.id });
    return next(new AppError("User not found", 404));
  }

  if (user._id.toString() === req.user.id) {
    logger.warn("Admin attempted self-delete", { id: req.params.id });
    return next(new AppError("You cannot delete your own admin account", 400));
  }

  // Soft delete by marking inactive
  user.active = false;
  await user.save({ validateBeforeSave: false });

  res.json({ success: true, message: "User deactivated successfully" });
  logger.info("Admin deactivated user", {
    id: req.params.id,
    adminId: req.user?.id,
  });
});

// ============================================================================
// PRODUCT MANAGEMENT
// ============================================================================

/**
 * @desc    Get all products for admin (paginated with advanced filtering)
 * @route   GET /api/admin/products
 * @access  Private/Admin
 */
export const getAllProducts = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Admin access only", 403));
  }

  logger.info("Admin fetch products", {
    route: req.originalUrl,
    method: req.method,
    adminId: req.user?.id,
    query: req.query,
  });

  const { page, limit, skip } = validatePagination(req.query);

  const query = {};
  const {
    search,
    category,
    brand,
    isActive,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  // Search functionality
  if (search) {
    const searchQuery = buildSearchQuery(search, ["name", "description", "sku"]);
    Object.assign(query, searchQuery);
  }

  // Filter by category
  if (category) {
    query.category = category;
  }

  // Filter by brand
  if (brand) {
    query.brand = brand;
  }

  // Filter by active status
  if (typeof isActive === "string") {
    query.isActive = isActive === "true";
  }

  // Build sort object
  const validSortFields = [
    "name",
    "category",
    "brand",
    "originalPrice",
    "finalPrice",
    "stock",
    "createdAt",
    "salesCount",
    "ratings.average",
  ];
  const sort = buildSortObject(sortBy, sortOrder, validSortFields);

  const products = await Product.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  const count = await Product.countDocuments(query);

  // Get aggregated statistics
  const stats = await Product.aggregate([
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        activeProducts: {
          $sum: {
            $cond: [{ $eq: ["$isActive", true] }, 1, 0],
          },
        },
        inactiveProducts: {
          $sum: {
            $cond: [{ $eq: ["$isActive", false] }, 1, 0],
          },
        },
        outOfStock: {
          $sum: {
            $cond: [{ $eq: ["$stock", 0] }, 1, 0],
          },
        },
        lowStock: {
          $sum: {
            $cond: [
              { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", 10] }] },
              1,
              0,
            ],
          },
        },
        totalStockValue: {
          $sum: { $multiply: ["$stock", "$finalPrice"] },
        },
      },
    },
  ]);

  res.json({
    success: true,
    count,
    page,
    pages: Math.ceil(count / limit),
    data: products,
    filters: { search, category, brand, isActive, sortBy, sortOrder },
    statistics:
      stats[0] || {
        totalProducts: 0,
        activeProducts: 0,
        inactiveProducts: 0,
        outOfStock: 0,
        lowStock: 0,
        totalStockValue: 0,
      },
  });
  logger.info("Admin fetched products", { count, page, limit, filters: req.query });
});

/**
 * @desc    Create new product with enhanced validation + Cloudinary upload
 * @route   POST /api/admin/products
 * @access  Private/Admin
 */
export const createProduct = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Admin access only", 403));
  }

  logger.info("Create product start", {
    userId: req.user?.id,
    bodyKeys: Object.keys(req.body || {}),
  });

  const {
    name,
    category,
    brand,
    originalPrice,
    discountPercentage = 0,
    stock = 0,
    images,
    description,
    features,
    specifications,
    sku,
    warranty = "1 year limited warranty",
    weight,
    dimensions,
  } = req.body;

  const validationErrors = [];

  // Required fields validation
  if (!name?.trim()) validationErrors.push("Product name is required");
  if (!category?.trim()) validationErrors.push("Category is required");
  if (!brand?.trim()) validationErrors.push("Brand is required");
  if (!originalPrice || originalPrice <= 0) {
    validationErrors.push("Valid original price is required");
  }
  if (!description?.trim()) validationErrors.push("Description is required");
  if (!sku?.trim()) validationErrors.push("SKU is required");

  // Discount validation
  if (discountPercentage < 0 || discountPercentage > 100) {
    validationErrors.push("Discount must be between 0 and 100%");
  }

  // Stock validation
  if (stock < 0 || !Number.isInteger(Number(stock))) {
    validationErrors.push("Stock must be a non-negative integer");
  }

  // Dynamic category validation from Product model enum
  if (category) {
    const categoryEnum =
      Product.schema.path("category")?.enumValues || [];

    if (!categoryEnum.includes(category)) {
      validationErrors.push("Invalid product category");
    }
  }

  // SKU uniqueness check
  if (sku) {
    const existingProduct = await Product.findOne({ sku: sku.trim() });
    if (existingProduct) {
      validationErrors.push("SKU must be unique");
    }
  }

  // Specifications validation
  if (specifications && Array.isArray(specifications)) {
    for (let i = 0; i < specifications.length; i++) {
      const spec = specifications[i];
      if (!spec?.key?.trim() || !spec?.value?.trim()) {
        validationErrors.push(
          `Specification at position ${i + 1} must have both key and value`
        );
      }
    }
  }

  if (validationErrors.length > 0) {
    return next(new AppError(validationErrors.join("; "), 400));
  }

  // ======================================================
  // IMAGE HANDLING (FILES OR URLS, BUT NOT BOTH)
  // ======================================================
  let finalImages = [];

  // Case A: Files uploaded (Cloudinary)
  if (req.files && req.files.length > 0) {
    // No mixing allowed: reject if URLs also provided
    if (images && Array.isArray(images) && images.length > 0) {
      return next(
        new AppError(
          "Provide either image files or image URLs, not both",
          400
        )
      );
    }

    const uploadPromises = req.files.map((file) => {
      return new Promise((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
          { folder: "products" },
          (err, result) => {
            if (err) return reject(err);
            resolve(result.secure_url);
          }
        );
        streamifier.createReadStream(file.buffer).pipe(upload);
      });
    });

    finalImages = await Promise.all(uploadPromises);
  }
  // Case B: URLs provided in body
  else if (images && Array.isArray(images)) {
    const imageRegex = /\.(jpg|jpeg|png|webp|avif)$/i;

    for (let i = 0; i < images.length; i++) {
      if (!imageRegex.test(images[i])) {
        validationErrors.push(
          `Invalid image URL at position ${i + 1}: ${images[i]}`
        );
      }
    }

    finalImages = images;
  }

  if (finalImages.length === 0) {
    return next(new AppError("At least one image is required", 400));
  }

  if (validationErrors.length > 0) {
    return next(new AppError(validationErrors.join("; "), 400));
  }

  // Calculate final price (controller-side clarity; model may also recalc)
  const finalPrice = parseFloat(
    (
      originalPrice -
      (originalPrice * discountPercentage) / 100
    ).toFixed(2)
  );

  // Create product
  const product = await Product.create({
    name: name.trim(),
    category: category.trim(),
    brand: brand.trim(),
    specifications: specifications || [],
    originalPrice,
    discountPercentage,
    finalPrice,
    stock,
    availability: stock > 0 ? "In Stock" : "Out of Stock",
    images: finalImages,
    description: description.trim(),
    features: features || [],
    sku: sku.trim(),
    warranty,
    weight,
    dimensions,
    ratings: { average: 0, totalReviews: 0 }, // Initialize ratings
    isActive: true,
    isFeatured: false,
    salesCount: 0,
  });

  res.status(201).json({
    success: true,
    data: product,
  });

  logger.info("Product created", { id: product._id, userId: req.user?.id });
});

/**
 * @desc    Update product (Cloudinary + URL images + category updates)
 * @route   PATCH /api/admin/products/:id
 * @access  Private/Admin
 */
export const updateProduct = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Admin access only", 403));
  }

  logger.info("Update product start", {
    id: req.params.id,
    userId: req.user?.id,
  });

  const product = await Product.findById(req.params.id);
  if (!product) {
    return next(new AppError("No product found with that ID", 404));
  }

  const previousCategory = product.category;

  // Create update object with only allowed fields
  const allowedFields = [
    "name",
    "brand",
    "category", // now updatable
    "originalPrice",
    "discountPercentage",
    "stock",
    "images",
    "description",
    "features",
    "specifications",
    "sku",
    "warranty",
    "weight",
    "dimensions",
    "isActive",
    "isFeatured",
  ];

  const updateData = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  // ======================================================
  // CATEGORY VALIDATION (DYNAMIC FROM MODEL ENUM)
  // ======================================================
  if (updateData.category) {
    const categoryEnum =
      Product.schema.path("category")?.enumValues || [];
    if (!categoryEnum.includes(updateData.category)) {
      return next(new AppError("Invalid product category", 400));
    }
  }

  // ======================================================
  // IMAGE HANDLING (FILES OR URLS, BUT NOT BOTH)
  // ======================================================
  let finalImages = product.images; // default: keep current images

  if (req.files && req.files.length > 0) {
    // No mixing allowed: if images in body too, reject
    if (updateData.images && Array.isArray(updateData.images) && updateData.images.length > 0) {
      return next(
        new AppError(
          "Provide either image files or image URLs, not both",
          400
        )
      );
    }

    const uploadPromises = req.files.map((file) => {
      return new Promise((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
          { folder: "products" },
          (err, result) => {
            if (err) return reject(err);
            resolve(result.secure_url);
          }
        );
        streamifier.createReadStream(file.buffer).pipe(upload);
      });
    });

    finalImages = await Promise.all(uploadPromises);
    updateData.images = finalImages;
  } else if (updateData.images && Array.isArray(updateData.images)) {
    const imageRegex = /\.(jpg|jpeg|png|webp|avif)$/i;

    for (const image of updateData.images) {
      if (!imageRegex.test(image)) {
        return next(new AppError(`Invalid image URL: ${image}`, 400));
      }
    }

    if (updateData.images.length === 0) {
      return next(new AppError("At least one image is required", 400));
    }

    finalImages = updateData.images;
  }
  // else: no image field provided & no files → keep existing product.images

  // ======================================================
  // SPECIFICATIONS VALIDATION
  // ======================================================
  if (updateData.specifications) {
    for (const spec of updateData.specifications) {
      if (!spec.key || !spec.value) {
        return next(
          new AppError("Specifications must have both key and value", 400)
        );
      }
    }
  }

  // ======================================================
  // PRICE & DISCOUNT HANDLING
  // ======================================================
  if (
    updateData.originalPrice !== undefined ||
    updateData.discountPercentage !== undefined
  ) {
    const original =
      updateData.originalPrice !== undefined
        ? updateData.originalPrice
        : product.originalPrice;

    const discount =
      updateData.discountPercentage !== undefined
        ? updateData.discountPercentage
        : product.discountPercentage;

    if (discount < 0 || discount > 100) {
      return next(new AppError("Discount must be between 0 and 100%", 400));
    }

    updateData.finalPrice = parseFloat(
      (
        original -
        (original * discount) / 100
      ).toFixed(2)
    );
  }

  // ======================================================
  // STOCK & AVAILABILITY
  // ======================================================
  if (updateData.stock !== undefined) {
    if (updateData.stock < 0) {
      return next(new AppError("Stock cannot be negative", 400));
    }

    updateData.availability =
      updateData.stock > 0 ? "In Stock" : "Out of Stock";
  }

  // ======================================================
  // SKU UNIQUENESS CHECK
  // ======================================================
  if (updateData.sku) {
    const existingProduct = await Product.findOne({ sku: updateData.sku });
    if (existingProduct && existingProduct._id.toString() !== req.params.id) {
      return next(new AppError("SKU must be unique", 400));
    }
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  // Extra consistency/logging when category changes
  if (
    updateData.category &&
    updateData.category !== previousCategory
  ) {
    logger.info("Product category changed", {
      productId: updatedProduct._id,
      from: previousCategory,
      to: updateData.category,
    });
    // Here you could also trigger cache invalidation / analytics refresh if needed
  }

  res.status(200).json({
    success: true,
    data: updatedProduct,
  });

  logger.info("Product updated", {
    id: req.params.id,
    userId: req.user?.id,
  });
});

/**
 * @desc    Delete product
 * @route   DELETE /api/admin/products/:id
 * @access  Private/Admin
 */
export const deleteProduct = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Admin access only", 403));
  }

  logger.info("Delete product start", {
    id: req.params.id,
    userId: req.user?.id,
  });
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError("No product found with that ID", 404));
  }

  await product.deleteOne();

  res.status(204).json({
    success: true,
    data: null,
  });
  logger.info("Product deleted", { id: req.params.id, userId: req.user?.id });
});

// ============================================================================
// PRODUCT REVIEW MANAGEMENT
// ============================================================================

/**
 * @desc    Get all reviews of a product (admin only)
 * @route   GET /api/admin/products/:id/reviews
 * @access  Private/Admin
 */
export const getProductReviews = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Admin access only", 403));
  }

  const reviews = await Review.find({ product: req.params.id }).sort({
    createdAt: -1,
  });

  res.status(200).json({
    success: true,
    count: reviews.length,
    data: reviews,
  });
  logger.info("Fetched product reviews", {
    productId: req.params.id,
    count: reviews.length,
  });
});

/**
 * @desc    Delete a review from a product (admin only)
 * @route   DELETE /api/admin/products/:productId/reviews/:reviewId
 * @access  Private/Admin
 */
export const deleteProductReview = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Admin access only", 403));
  }

  const { productId, reviewId } = req.params;

  const review = await Review.findOne({ _id: reviewId, product: productId });

  if (!review) {
    logger.warn("Review not found", { productId, reviewId });
    return next(new AppError("No review found with that ID", 404));
  }

  // Soft delete review (so history is preserved)
  await review.softDelete();

  // Recalculate product ratings
  await Review.calculateAverageRatings(productId, null);

  res.status(200).json({
    success: true,
    message: "Review deleted",
  });
  logger.info("Review deleted", { productId, reviewId });
});

// ============================================================================
// ORDER MANAGEMENT
// ============================================================================

/**
 * @desc    Get all orders (Admin only)
 * @route   GET /api/admin/orders
 * @access  Private/Admin
 */
export const getOrders = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Admin access only", 403));
  }

  logger.info("Admin fetch orders", { userId: req.user._id, query: req.query });

  const { page, limit, skip } = validatePagination(req.query);
  const { status } = req.query;

  const query = {};
  const allowedStatuses = [
    "pending",
    "paid",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ];

  if (status && allowedStatuses.includes(status)) {
    query.status = status;
  }

  const orders = await Order.find(query)
    .populate("user", "id name")
    .skip(skip)
    .limit(limit)
    .sort("-createdAt");

  const count = await Order.countDocuments(query);

  res.json({
    success: true,
    count,
    page,
    pages: Math.ceil(count / limit),
    data: orders,
  });
  logger.info("Admin fetched orders", { count, page, limit });
});

/**
 * @desc    Update order to delivered
 * @route   PUT /api/admin/orders/:id/deliver
 * @access  Private/Admin
 */
export const updateOrderToDelivered = asyncHandler(
  async (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
      return next(new AppError("Admin access only", 403));
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      logger.warn("Order not found for deliver", { id: req.params.id });
      return next(new AppError("Order not found", 404));
    }

    if (!order.isPaid) {
      return next(new AppError("Order must be paid before delivery", 400));
    }

    if (order.isDelivered) {
      return next(new AppError("Order is already marked as delivered", 400));
    }

    order.isDelivered = true;
    order.deliveredAt = new Date();
    order.status = "delivered";

    const updatedOrder = await order.save();

    res.json({
      success: true,
      data: updatedOrder,
    });
    logger.info("Order delivered", {
      id: req.params.id,
      userId: req.user._id,
    });
  }
);

/**
 * @desc    Mark order as paid
 * @route   PUT /api/admin/orders/:id/mark-paid
 * @access  Private/Admin
 */
export const markOrderAsPaid = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Admin access only", 403));
  }

  logger.info("Mark order paid start", {
    id: req.params.id,
    userId: req.user._id,
  });
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  if (order.isPaid) {
    return next(new AppError("Order is already marked as paid", 400));
  }

  const paymentResult = {
    id: "ADMIN-MANUAL",
    status: "manual",
    update_time: new Date().toISOString(),
    email_address: req.user.email,
    method: "manual",
  };

  await order.markAsPaid(paymentResult);

  res.status(200).json({
    success: true,
    data: order,
    message: "Order marked as paid",
  });
  logger.info("Order marked as paid", {
    id: req.params.id,
    userId: req.user._id,
  });
});

/**
 * @desc    Update order status (Admin only)
 * @route   PUT /api/admin/orders/:id/status
 * @access  Private/Admin
 */
export const updateOrderStatus = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Admin access only", 403));
  }

  logger.info("Update order status start", {
    id: req.params.id,
    userId: req.user._id,
    status: req.body?.status,
  });

  const { status } = req.body;
  // Must align with Order model enum
  const allowedStatuses = [
    "pending",
    "paid",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ];

  if (!allowedStatuses.includes(status)) {
    return next(new AppError("Invalid status", 400));
  }

  if (status === "paid") {
    return next(
      new AppError(
        "Use /mark-paid route to mark an order as paid to keep payment data consistent",
        400
      )
    );
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  order.status = status;
  const updatedOrder = await order.save();

  res.status(200).json({
    success: true,
    data: updatedOrder,
    message: `Order status updated to ${status}`,
  });
  logger.info("Order status updated", {
    id: req.params.id,
    status,
    userId: req.user._id,
  });
});

// ============================================================================
// REFUND & RETURN MANAGEMENT
// ============================================================================

/**
 * @desc    Process refund (manual admin refund)
 * @route   POST /api/admin/orders/:id/refund
 * @access  Private/Admin
 */
export const processRefund = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Admin access only", 403));
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(req.params.id).session(session);

    if (!order) {
      logger.warn("Order not found for refund", { id: req.params.id });
      await session.abortTransaction();
      session.endSession();
      return next(new AppError("Order not found", 404));
    }

    if (!order.isPaid) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError("Order is not paid", 400));
    }

    if (order.status === "refunded") {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError("Order is already refunded", 400));
    }

    // Basic checks: allow refund from paid/shipped/delivered
    if (!["paid", "shipped", "delivered"].includes(order.status)) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError("Order cannot be refunded in its current status", 400));
    }

    // Update fields to reflect refund
    order.status = "refunded";
    order.isPaid = false;

    if (!order.paymentResult) {
      order.paymentResult = {};
    }
    order.paymentResult.status = "refunded";
    order.paymentResult.update_time = new Date().toISOString();

    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Refund processed successfully",
      data: order,
    });
    logger.info("Order refunded", {
      id: req.params.id,
      userId: req.user._id,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return next(new AppError(`Refund failed: ${error.message}`, 400));
  }
});

/**
 * @desc    Process order return (Admin only)
 * @route   PUT /api/admin/orders/:id/process-return
 * @access  Private/Admin
 */
export const processReturn = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Admin access only", 403));
  }

  logger.info("Process return start", {
    id: req.params.id,
    userId: req.user._id,
    action: req.body?.action,
  });

  const { action, rejectionReason } = req.body;

  if (!["approve", "reject"].includes(action)) {
    return next(new AppError("Invalid action", 400));
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(req.params.id).session(session);

    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError("Order not found", 404));
    }

    if (order.returnStatus !== "requested") {
      await session.abortTransaction();
      session.endSession();
      return next(
        new AppError("No pending return request for this order", 400)
      );
    }

    if (action === "approve") {
      order.returnStatus = "approved";
      order.status = "refunded";
      order.isPaid = false;

      if (!order.paymentResult) {
        order.paymentResult = {};
      }
      order.paymentResult.status = "refunded";
      order.paymentResult.update_time = new Date().toISOString();
    } else if (action === "reject") {
      order.returnStatus = "rejected";
      // Keep as delivered if it was delivered
      if (order.status === "refunded") {
        order.status = "delivered";
      }
      // You might log rejectionReason somewhere else in the future
      if (!order.notes) {
        order.notes = "";
      }
      order.notes += `\nReturn rejected: ${
        rejectionReason || "Not specified"
      } - ${new Date().toISOString()}`;
    }

    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: `Return request ${action}d`,
      data: order,
    });
    logger.info("Return processed", {
      id: req.params.id,
      action,
      userId: req.user._id,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return next(new AppError(`Return processing failed: ${err.message}`, 400));
  }
});

// ============================================================================
// COUPON MANAGEMENT
// ============================================================================

/**
 * @desc    Create a new coupon
 * @route   POST /api/admin/coupons
 * @access  Private/Admin
 */
export const createCoupon = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Admin access only", 403));
  }

  logger.info("Create coupon start", { bodyKeys: Object.keys(req.body || {}), userId: req.user?.id });

  const {
    code,
    discountType,
    discountValue,
    validFrom,
    validTo,
    minPurchase,
    maxDiscount,
    usageLimit,
    perUserLimit,
    applicableProducts,
    excludedProducts,
    description,
  } = req.body;

  if (
    !code ||
    !discountType ||
    discountValue == null ||
    !validFrom ||
    !validTo
  ) {
    return next(
      new AppError("Missing required fields for coupon creation", 400)
    );
  }

  const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });

  if (existingCoupon) {
    return next(new AppError("Coupon code already exists", 400));
  }

  const coupon = await Coupon.create({
    code: code.toUpperCase(),
    discountType,
    discountValue,
    validFrom,
    validTo,
    minPurchase,
    maxDiscount,
    usageLimit,
    perUserLimit,
    applicableProducts,
    excludedProducts,
    description,
    isActive: true,
  });

  res.status(201).json({
    success: true,
    data: coupon,
  });
  logger.info("Coupon created", {
    id: coupon._id,
    code: coupon.code,
    userId: req.user?.id,
  });
});

/**
 * @desc    Get all coupons
 * @route   GET /api/admin/coupons
 * @access  Private/Admin
 */
export const getCoupons = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Admin access only", 403));
  }

  logger.info("Fetch coupons", {
    route: req.originalUrl,
    method: req.method,
  });
  const coupons = await Coupon.find().sort({ validFrom: -1 });

  res.status(200).json({
    success: true,
    results: coupons.length,
    data: coupons,
  });
  logger.info("Fetched coupons", { count: coupons.length });
});

/**
 * @desc    Get single coupon by ID
 * @route   GET /api/admin/coupons/:id
 * @access  Private/Admin
 */
export const getCoupon = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Admin access only", 403));
  }

  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    logger.warn("Coupon not found", { id: req.params.id });
    return next(new AppError("Coupon not found", 404));
  }

  res.status(200).json({
    success: true,
    data: coupon,
  });
  logger.info("Fetched coupon", { id: req.params.id });
});

/**
 * @desc    Update a coupon
 * @route   PATCH /api/admin/coupons/:id
 * @access  Private/Admin
 */
export const updateCoupon = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Admin access only", 403));
  }

  logger.info("Update coupon start", {
    id: req.params.id,
    bodyKeys: Object.keys(req.body || {}),
  });

  const updates = { ...req.body };

  if (updates.code) {
    updates.code = updates.code.toUpperCase();
  }

  const coupon = await Coupon.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!coupon) {
    logger.warn("Coupon not found for update", { id: req.params.id });
    return next(new AppError("Coupon not found", 404));
  }

  res.status(200).json({
    success: true,
    data: coupon,
  });
  logger.info("Updated coupon", { id: req.params.id });
});

/**
 * @desc    Delete a coupon
 * @route   DELETE /api/admin/coupons/:id
 * @access  Private/Admin
 */
export const deleteCoupon = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Admin access only", 403));
  }

  logger.info("Delete coupon start", {
    id: req.params.id,
    userId: req.user?.id,
  });
  const coupon = await Coupon.findByIdAndDelete(req.params.id);

  if (!coupon) {
    logger.warn("Coupon not found for delete", { id: req.params.id });
    return next(new AppError("Coupon not found", 404));
  }

  res.status(204).json({
    success: true,
    data: null,
  });
  logger.info("Deleted coupon", { id: req.params.id, userId: req.user?.id });
});
