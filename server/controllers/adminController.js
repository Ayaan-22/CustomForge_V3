// server/controllers/adminController.js

import User from "../models/User.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Review from "../models/Review.js";
import Coupon from "../models/Coupon.js";
import AppError from "../utils/appError.js";
import asyncHandler from "express-async-handler";
import { logger } from "../middleware/logger.js";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate and sanitize pagination parameters
 */
const validatePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
};

/**
 * Build search query for text fields
 */
const buildSearchQuery = (searchTerm, searchFields) => {
  if (!searchTerm) return {};
  
  return {
    $or: searchFields.map(field => ({
      [field]: { $regex: searchTerm, $options: 'i' }
    }))
  };
};

/**
 * Validate and build sort object
 */
const buildSortObject = (sortBy, sortOrder, validFields, defaultSort = { createdAt: -1 }) => {
  const sort = {};
  const order = sortOrder === 'asc' ? 1 : -1;
  
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
    throw new AppError('Invalid date format', 400);
  }
  
  if (start > end) {
    throw new AppError('Start date must be before end date', 400);
  }
  
  if (start > now) {
    throw new AppError('Start date cannot be in the future', 400);
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
export const getSalesAnalytics = asyncHandler(async (req, res) => {
  const { days = 30, period = 'daily' } = req.query;
  
  // Validate period
  const validPeriods = ['daily', 'weekly', 'monthly'];
  const actualPeriod = validPeriods.includes(period) ? period : 'daily';
  
  let dateFormat, groupBy;
  switch (actualPeriod) {
    case 'weekly':
      dateFormat = "%Y-W%U";
      groupBy = { $week: "$createdAt", $year: "$createdAt" };
      break;
    case 'monthly':
      dateFormat = "%Y-%m";
      groupBy = { $month: "$createdAt", $year: "$createdAt" };
      break;
    default:
      dateFormat = "%Y-%m-%d";
      groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
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
          totalRevenue: { $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] } },
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

  res.json({ 
    success: true, 
    data: {
      salesTrend: salesData,
      topProducts,
      customerStats: customerStats[0] || {
        totalCustomers: 0,
        totalRevenue: 0,
        avgOrderValue: 0
      },
      period: actualPeriod,
      days
    }
  });
  logger.info("Admin fetched comprehensive sales analytics", { days, period: actualPeriod });
});

/**
 * @desc    Get product statistics grouped by category
 * @route   GET /api/admin/analytics/products
 * @access  Private/Admin
 */
export const getProductStats = asyncHandler(async (req, res) => {
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
export const getDashboardOverview = asyncHandler(async (req, res) => {
  const { period = '30d' } = req.query;
  
  // Calculate date range based on period
  let days;
  switch (period) {
    case '7d': days = 7; break;
    case '30d': days = 30; break;
    case '90d': days = 90; break;
    case '1y': days = 365; break;
    default: days = 30;
  }
  
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const previousPeriodStart = new Date(Date.now() - (days * 2) * 24 * 60 * 60 * 1000);

  const [
    currentPeriodStats,
    previousPeriodStats,
    userStats,
    productStats,
    recentOrders
  ] = await Promise.all([
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
          activeUsers: { $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] } },
          newUsers: { $sum: { $cond: [{ $gte: ["$createdAt", startDate] }, 1, 0] } },
        },
      },
    ]),
    
    // Product statistics
    Product.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          activeProducts: { $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] } },
          lowStockProducts: { $sum: { $cond: [{ $lte: ["$stock", 10] }, 1, 0] } },
          outOfStockProducts: { $sum: { $cond: [{ $eq: ["$stock", 0] }, 1, 0] } },
        },
      },
    ]),
    
    // Recent orders
    Order.find({ isPaid: true })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('totalPrice createdAt orderItems user')
      .lean(),
  ]);

  const current = currentPeriodStats[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, uniqueCustomers: [] };
  const previous = previousPeriodStats[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, uniqueCustomers: [] };
  const users = userStats[0] || { totalUsers: 0, activeUsers: 0, newUsers: 0 };
  const products = productStats[0] || { totalProducts: 0, activeProducts: 0, lowStockProducts: 0, outOfStockProducts: 0 };

  // Calculate growth percentages
  const revenueGrowth = previous.totalRevenue > 0 
    ? ((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue * 100).toFixed(1)
    : 0;
    
  const ordersGrowth = previous.totalOrders > 0 
    ? ((current.totalOrders - previous.totalOrders) / previous.totalOrders * 100).toFixed(1)
    : 0;

  res.json({
    success: true,
    data: {
      period,
      revenue: {
        current: current.totalRevenue,
        previous: previous.totalRevenue,
        growth: parseFloat(revenueGrowth),
        avgOrderValue: Math.round(current.avgOrderValue || 0)
      },
      orders: {
        current: current.totalOrders,
        previous: previous.totalOrders,
        growth: parseFloat(ordersGrowth)
      },
      customers: {
        current: current.uniqueCustomers.length,
        previous: previous.uniqueCustomers.length
      },
      users: {
        total: users.totalUsers,
        active: users.activeUsers,
        new: users.newUsers
      },
      products: {
        total: products.totalProducts,
        active: products.activeProducts,
        lowStock: products.lowStockProducts,
        outOfStock: products.outOfStockProducts
      },
      recentOrders
    }
  });
  
  logger.info("Admin fetched dashboard overview", { period, days });
});

/**
 * @desc    Get inventory analytics
 * @route   GET /api/admin/analytics/inventory
 * @access  Private/Admin
 */
export const getInventoryAnalytics = asyncHandler(async (req, res) => {
  const [
    stockLevels,
    categoryStock,
    lowStockProducts,
    topSellingProducts
  ] = await Promise.all([
    // Stock level distribution
    Product.aggregate([
      {
        $group: {
          _id: null,
          totalStock: { $sum: "$stock" },
          avgStock: { $avg: "$stock" },
          outOfStock: { $sum: { $cond: [{ $eq: ["$stock", 0] }, 1, 0] } },
          lowStock: { $sum: { $cond: [{ $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", 10] }] }, 1, 0] } },
          inStock: { $sum: { $cond: [{ $gt: ["$stock", 10] }, 1, 0] } },
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
          lowStockCount: { $sum: { $cond: [{ $lte: ["$stock", 10] }, 1, 0] } },
        },
      },
      { $sort: { totalStock: -1 } },
    ]),
    
    // Low stock products
    Product.find({
      stock: { $lte: 10, $gt: 0 },
      isActive: true
    })
      .select('name category stock sku')
      .sort({ stock: 1 })
      .limit(20)
      .lean(),
    
    // Top selling products (based on salesCount)
    Product.find({ isActive: true })
      .select('name category salesCount stock')
      .sort({ salesCount: -1 })
      .limit(10)
      .lean(),
  ]);

  res.json({
    success: true,
    data: {
      stockLevels: stockLevels[0] || {
        totalStock: 0,
        avgStock: 0,
        outOfStock: 0,
        lowStock: 0,
        inStock: 0
      },
      categoryStock,
      lowStockProducts,
      topSellingProducts
    }
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
  logger.info("Admin create user start", { adminId: req.user?.id, bodyKeys: Object.keys(req.body || {}) });
  
  const {
    name,
    email,
    password,
    role = 'user',
    phone,
    address,
    isActive = true
  } = req.body;

  // Enhanced validation
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
  
  // Password validation
  if (password && password.length < 6) {
    validationErrors.push("Password must be at least 6 characters long");
  }
  
  // Role validation
  const validRoles = ['user', 'admin'];
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

  // Create user
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    role,
    phone: phone?.trim(),
    address,
    isActive,
    isEmailVerified: false // Admin-created users need to verify email
  });

  // Remove sensitive data from response
  const userResponse = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    address: user.address,
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt
  };

  res.status(201).json({
    success: true,
    message: "User created successfully",
    data: userResponse
  });
  logger.info("Admin created user", { userId: user._id, email: user.email, role: user.role, adminId: req.user?.id });
});

/**
 * @desc    Get all users (paginated with advanced filtering)
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  logger.info("Admin fetch users", { route: req.originalUrl, method: req.method, adminId: req.user?.id, query: req.query });
  
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 10, 100); // Max 100 per page
  const skip = (page - 1) * limit;

  // Build query with filters
  const query = {};
  const { search, role, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  
  // Search functionality
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }
  
  // Filter by role
  if (role && ['user', 'admin'].includes(role)) {
    query.role = role;
  }
  
  // Filter by active status
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }
  
  // Build sort object
  const sort = {};
  const validSortFields = ['name', 'email', 'createdAt', 'lastLoginAt'];
  if (validSortFields.includes(sortBy)) {
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
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
    filters: { search, role, isActive, sortBy, sortOrder }
  });
  logger.info("Admin fetched users", { count, page, limit, filters: req.query });
});

/**
 * @desc    Get a user by ID
 * @route   GET /api/admin/users/:id
 * @access  Private/Admin
 */
export const getUserById = asyncHandler(async (req, res, next) => {
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
  logger.info("Update user start", { id: req.params.id, bodyKeys: Object.keys(req.body || {}) });
  if (req.body.password) {
    return next(new AppError("Use the proper route for password updates", 400));
  }

  const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
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
 * @desc    Delete a user
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
export const deleteUser = asyncHandler(async (req, res, next) => {
  logger.info("Admin delete user start", { id: req.params.id, adminId: req.user?.id });
  const user = await User.findById(req.params.id);

  if (!user) {
    logger.warn("Admin user not found for delete", { id: req.params.id });
    return next(new AppError("User not found", 404));
  }

  if (user._id.toString() === req.user.id) {
    logger.warn("Admin attempted self-delete", { id: req.params.id });
    return next(new AppError("You cannot delete your own admin account", 400));
  }

  await user.deleteOne();

  res.json({ success: true, message: "User deleted successfully" });
  logger.info("Admin deleted user", { id: req.params.id, adminId: req.user?.id });
});

// ============================================================================
// PRODUCT MANAGEMENT
// ============================================================================

/**
 * @desc    Get all products for admin (paginated with advanced filtering)
 * @route   GET /api/admin/products
 * @access  Private/Admin
 */
export const getAllProducts = asyncHandler(async (req, res) => {
  logger.info("Admin fetch products", { route: req.originalUrl, method: req.method, adminId: req.user?.id, query: req.query });
  
  const { page, limit, skip } = validatePagination(req.query);
  
  // Build query with filters
  const query = {};
  const { search, category, brand, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  
  // Search functionality
  if (search) {
    const searchQuery = buildSearchQuery(search, ['name', 'description', 'sku']);
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
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }
  
  // Build sort object
  const validSortFields = ['name', 'category', 'brand', 'originalPrice', 'finalPrice', 'stock', 'createdAt', 'salesCount', 'ratings.average'];
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
        activeProducts: { $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] } },
        inactiveProducts: { $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] } },
        outOfStock: { $sum: { $cond: [{ $eq: ["$stock", 0] }, 1, 0] } },
        lowStock: { $sum: { $cond: [{ $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", 10] }] }, 1, 0] } },
        totalStockValue: { $sum: { $multiply: ["$stock", "$finalPrice"] } }
      }
    }
  ]);

  res.json({
    success: true,
    count,
    page,
    pages: Math.ceil(count / limit),
    data: products,
    filters: { search, category, brand, isActive, sortBy, sortOrder },
    statistics: stats[0] || {
      totalProducts: 0,
      activeProducts: 0,
      inactiveProducts: 0,
      outOfStock: 0,
      lowStock: 0,
      totalStockValue: 0
    }
  });
  logger.info("Admin fetched products", { count, page, limit, filters: req.query });
});

/**
 * @desc    Create new product with enhanced validation
 * @route   POST /api/admin/products
 * @access  Private/Admin
 */
export const createProduct = asyncHandler(async (req, res, next) => {
  logger.info("Create product start", { userId: req.user?.id, bodyKeys: Object.keys(req.body || {}) });
  
  // Sanitize and validate input
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
    dimensions
  } = req.body;

  // Enhanced validation with detailed error messages
  const validationErrors = [];
  
  // Required fields validation
  if (!name?.trim()) validationErrors.push("Product name is required");
  if (!category?.trim()) validationErrors.push("Category is required");
  if (!brand?.trim()) validationErrors.push("Brand is required");
  if (!originalPrice || originalPrice <= 0) validationErrors.push("Valid original price is required");
  if (!images || !Array.isArray(images) || images.length === 0) validationErrors.push("At least one image is required");
  if (!description?.trim()) validationErrors.push("Description is required");
  if (!sku?.trim()) validationErrors.push("SKU is required");
  
  // Price validation
  if (discountPercentage < 0 || discountPercentage > 100) {
    validationErrors.push("Discount must be between 0 and 100%");
  }
  
  // Stock validation
  if (stock < 0 || !Number.isInteger(stock)) {
    validationErrors.push("Stock must be a non-negative integer");
  }
  
  // SKU uniqueness check
  if (sku) {
    const existingProduct = await Product.findOne({ sku: sku.trim() });
    if (existingProduct) {
      validationErrors.push("SKU must be unique");
    }
  }
  
  // Image URL validation
  if (images && Array.isArray(images)) {
    const imageRegex = /\.(jpg|jpeg|png|webp|avif)$/i;
    for (let i = 0; i < images.length; i++) {
      if (!imageRegex.test(images[i])) {
        validationErrors.push(`Invalid image URL at position ${i + 1}: ${images[i]}`);
      }
    }
  }
  
  // Specifications validation
  if (specifications && Array.isArray(specifications)) {
    for (let i = 0; i < specifications.length; i++) {
      const spec = specifications[i];
      if (!spec?.key?.trim() || !spec?.value?.trim()) {
        validationErrors.push(`Specification at position ${i + 1} must have both key and value`);
      }
    }
  }
  
  // Category validation
  const validCategories = [
    "Prebuilt PCs", "CPU", "GPU", "Motherboard", "RAM", "Storage", 
    "Power Supply", "Cooler", "Case", "OS", "Networking", "RGB",
    "CaptureCard", "Monitor", "Keyboard", "Mouse", "Mousepad",
    "Headset", "Speakers", "Controller", "ExternalStorage", "VR",
    "StreamingGear", "Microphone", "Webcam", "GamingChair",
    "GamingDesk", "SoundCard", "Cables", "GamingLaptop", "Games",
    "PCGames", "ConsoleGames", "VRGames"
  ];
  
  if (category && !validCategories.includes(category)) {
    validationErrors.push("Invalid product category");
  }
  
  // Return all validation errors at once
  if (validationErrors.length > 0) {
    return next(new AppError(validationErrors.join("; "), 400));
  }

  // Validate discount percentage
  if (discountPercentage < 0 || discountPercentage > 100) {
    return next(new AppError("Discount must be between 0 and 100%", 400));
  }

  // Validate image URLs
  const imageRegex = /\.(jpg|jpeg|png|webp)$/i;
  for (const image of images) {
    if (!imageRegex.test(image)) {
      return next(new AppError(`Invalid image URL: ${image}`, 400));
    }
  }

  // Validate specifications if provided
  if (specifications && specifications.length > 0) {
    for (const spec of specifications) {
      if (!spec.key || !spec.value) {
        return next(new AppError("Specifications must have both key and value", 400));
      }
    }
  }

  // Calculate final price
  const finalPrice = parseFloat(
    (originalPrice - (originalPrice * discountPercentage / 100)).toFixed(2)
  );

  // Create product
  const product = await Product.create({
    name,
    category,
    brand,
    specifications: specifications || [],
    originalPrice,
    discountPercentage,
    finalPrice,
    stock,
    availability: stock > 0 ? "In Stock" : "Out of Stock",
    images,
    description,
    features: features || [],
    sku,
    warranty,
    weight,
    dimensions,
    ratings: { average: 0, totalReviews: 0 }, // Initialize ratings
    isActive: true,
    isFeatured: false,
    salesCount: 0
  });

  res.status(201).json({
    success: true,
    data: product
  });
  logger.info("Product created", { id: product._id, userId: req.user?.id });
});

/**
 * @desc    Update product
 * @route   PATCH /api/admin/products/:id
 * @access  Private/Admin
 */
export const updateProduct = asyncHandler(async (req, res, next) => {
  logger.info("Update product start", { id: req.params.id, userId: req.user?.id });
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError("No product found with that ID", 404));
  }

  // Create update object with only allowed fields
  const updateData = {};
  const allowedFields = [
    'name', 'category', 'brand', 'originalPrice', 'discountPercentage', 
    'stock', 'images', 'description', 'features', 'specifications',
    'sku', 'warranty', 'weight', 'dimensions', 'isActive', 'isFeatured'
  ];

  // Copy allowed fields from req.body to updateData
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  // Validate images if being updated
  if (updateData.images) {
    const imageRegex = /\.(jpg|jpeg|png|webp)$/i;
    for (const image of updateData.images) {
      if (!imageRegex.test(image)) {
        return next(new AppError(`Invalid image URL: ${image}`, 400));
      }
    }
    if (updateData.images.length === 0) {
      return next(new AppError("At least one image is required", 400));
    }
  }

  // Validate specifications if being updated
  if (updateData.specifications) {
    for (const spec of updateData.specifications) {
      if (!spec.key || !spec.value) {
        return next(new AppError("Specifications must have both key and value", 400));
      }
    }
  }

  // Handle price updates
  if (updateData.originalPrice !== undefined || updateData.discountPercentage !== undefined) {
    const originalPrice = updateData.originalPrice !== undefined ? updateData.originalPrice : product.originalPrice;
    const discountPercentage = updateData.discountPercentage !== undefined 
      ? updateData.discountPercentage 
      : product.discountPercentage;
    
    if (discountPercentage < 0 || discountPercentage > 100) {
      return next(new AppError("Discount must be between 0 and 100%", 400));
    }
    
    updateData.finalPrice = parseFloat(
      (originalPrice - (originalPrice * discountPercentage / 100)).toFixed(2)
    );
  }

  // Handle stock updates
  if (updateData.stock !== undefined) {
    if (updateData.stock < 0) {
      return next(new AppError("Stock cannot be negative", 400));
    }
    updateData.availability = updateData.stock > 0 ? "In Stock" : "Out of Stock";
  }

  // Validate category if being updated
  if (updateData.category) {
    const validCategories = [
      "Prebuilt PCs", "CPU", "GPU", "Motherboard", "RAM", "Storage", 
      "Power Supply", "Cooler", "Case", "OS", "Networking", "RGB",
      "CaptureCard", "Monitor", "Keyboard", "Mouse", "Mousepad",
      "Headset", "Speakers", "Controller", "ExternalStorage", "VR",
      "StreamingGear", "Microphone", "Webcam", "GamingChair",
      "GamingDesk", "SoundCard", "Cables", "GamingLaptop", "Games",
      "PCGames", "ConsoleGames", "VRGames"
    ];
    
    if (!validCategories.includes(updateData.category)) {
      return next(new AppError("Invalid product category", 400));
    }
  }

  // Validate SKU if being updated
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
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    data: updatedProduct
  });
  logger.info("Product updated", { id: req.params.id, userId: req.user?.id });
});

/**
 * @desc    Delete product
 * @route   DELETE /api/admin/products/:id
 * @access  Private/Admin
 */
export const deleteProduct = asyncHandler(async (req, res, next) => {
  logger.info("Delete product start", { id: req.params.id, userId: req.user?.id });
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError("No product found with that ID", 404));
  }

  await product.deleteOne();

  res.status(204).json({
    success: true,
    data: null
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
  const reviews = await Review.find({ product: req.params.id })
    .populate({
      path: "user",
      select: "name email avatar",
    })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: reviews.length,
    data: reviews,
  });
  logger.info("Fetched product reviews", { productId: req.params.id, count: reviews.length });
});

/**
 * @desc    Delete a review from a product (admin only)
 * @route   DELETE /api/admin/products/:productId/reviews/:reviewId
 * @access  Private/Admin
 */
export const deleteProductReview = asyncHandler(async (req, res, next) => {
  const { productId, reviewId } = req.params;

  const product = await Product.findById(productId);
  if (!product) {
    logger.warn("Delete review product not found", { productId, reviewId });
    return next(new AppError("No product found with that ID", 404));
  }

  const reviewIndex = product.reviews.findIndex(
    (r) => r._id.toString() === reviewId
  );
  if (reviewIndex === -1) {
    logger.warn("Review not found", { productId, reviewId });
    return next(new AppError("No review found with that ID", 404));
  }

  product.reviews.splice(reviewIndex, 1);
  product.ratings.totalReviews = product.reviews.length;
  product.ratings.average =
    product.reviews.reduce((acc, r) => acc + r.rating, 0) /
      product.ratings.totalReviews || 0;

  await product.save();

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
export const getOrders = asyncHandler(async (req, res) => {
  logger.info("Admin fetch orders", { userId: req.user._id, query: req.query });
  const { page = 1, limit = 20, status } = req.query;
  const skip = (page - 1) * limit;

  const query = {};
  if (status) query.status = status;

  const orders = await Order.find(query)
    .populate("user", "id name")
    .skip(skip)
    .limit(parseInt(limit))
    .sort("-createdAt");

  const count = await Order.countDocuments(query);

  res.json({
    success: true,
    count,
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
export const updateOrderToDelivered = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    logger.warn("Order not found for deliver", { id: req.params.id });
    return next(new AppError("Order not found", 404));
  }

  if (!order.isPaid) {
    return next(new AppError("Order must be paid before delivery", 400));
  }

  order.isDelivered = true;
  order.deliveredAt = Date.now();
  order.status = "delivered";

  const updatedOrder = await order.save();

  res.json({
    success: true,
    data: updatedOrder,
  });
  logger.info("Order delivered", { id: req.params.id, userId: req.user._id });
});

/**
 * @desc    Mark order as paid
 * @route   PUT /api/admin/orders/:id/mark-paid
 * @access  Private/Admin
 */
export const markOrderAsPaid = asyncHandler(async (req, res, next) => {
  logger.info("Mark order paid start", { id: req.params.id, userId: req.user._id });
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  if (order.isPaid) {
    return next(new AppError("Order is already marked as paid", 400));
  }

  order.isPaid = true;
  order.paidAt = Date.now();
  order.paymentResult = {
    status: "manual",
    updated_time: new Date(),
    email_address: req.user.email,
  };

  const updatedOrder = await order.save();

  res.status(200).json({
    success: true,
    data: updatedOrder,
    message: "Order marked as paid",
  });
  logger.info("Order marked as paid", { id: req.params.id, userId: req.user._id });
});

/**
 * @desc    Update order status (Admin only)
 * @route   PUT /api/admin/orders/:id/status
 * @access  Private/Admin
 */
export const updateOrderStatus = asyncHandler(async (req, res, next) => {
  logger.info("Update order status start", { id: req.params.id, userId: req.user._id, status: req.body?.status });
  const { status } = req.body;
  const allowedStatuses = ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"];

  if (!allowedStatuses.includes(status)) {
    return next(new AppError("Invalid status", 400));
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
  logger.info("Order status updated", { id: req.params.id, status, userId: req.user._id });
});

// ============================================================================
// REFUND & RETURN MANAGEMENT
// ============================================================================

/**
 * @desc    Process refund
 * @route   POST /api/admin/orders/:id/refund
 * @access  Private/Admin
 */
export const processRefund = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  
  if (!order) {
    logger.warn("Order not found for refund", { id: req.params.id });
    return next(new AppError('Order not found', 404));
  }

  if (!order.isPaid) {
    return next(new AppError('Order is not paid', 400));
  }

  if (order.status !== 'delivered') {
    return next(new AppError('Only delivered orders can be refunded', 400));
  }

  try {
    await order.processRefund();
    
    res.status(200).json({
      success: true,
      message: 'Refund processed successfully'
    });
    logger.info("Order refunded", { id: req.params.id, userId: req.user._id });
    
  } catch (error) {
    return next(new AppError(`Refund failed: ${error.message}`, 400));
  }
});

/**
 * @desc    Process order return (Admin only)
 * @route   PUT /api/admin/orders/:id/process-return
 * @access  Private/Admin
 */
export const processReturn = asyncHandler(async (req, res, next) => {
  logger.info("Process return start", { id: req.params.id, userId: req.user._id, action: req.body?.action });
  const { action, rejectionReason } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  if (order.status !== 'return_requested') {
    return next(new AppError("No pending return request for this order", 400));
  }

  if (action === "approve") {
    order.status = "refunded";
    order.refundedAt = new Date();
    order.returnRequest.status = "approved";
    order.returnRequest.processedAt = new Date();
  } else if (action === "reject") {
    order.status = "delivered"; // Revert to delivered status
    order.returnRequest.status = "rejected";
    order.returnRequest.processedAt = new Date();
    order.returnRequest.rejectionReason = rejectionReason || "Not specified";
  } else {
    return next(new AppError("Invalid action", 400));
  }

  await order.save();

  res.json({
    success: true,
    message: `Return request ${action}d`,
  });
  logger.info("Return processed", { id: req.params.id, action, userId: req.user._id });
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
  logger.info("Create coupon start", { body: req.body, userId: req.user?.id });
  const {
    code,
    discountType,
    discountValue,
    validFrom,
    validTo,
    minPurchase,
    maxDiscount,
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
    isActive: true,
  });

  res.status(201).json({
    success: true,
    data: coupon,
  });
  logger.info("Coupon created", { id: coupon._id, code: coupon.code, userId: req.user?.id });
});

/**
 * @desc    Get all coupons
 * @route   GET /api/admin/coupons
 * @access  Private/Admin
 */
export const getCoupons = asyncHandler(async (req, res) => {
  logger.info("Fetch coupons", { route: req.originalUrl, method: req.method });
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
  logger.info("Update coupon start", { id: req.params.id, bodyKeys: Object.keys(req.body || {}) });
  const updates = req.body;

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
  logger.info("Delete coupon start", { id: req.params.id, userId: req.user?.id });
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