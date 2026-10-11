// server/controllers/adminController.js

import User from "../models/User.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Review from "../models/Review.js";
import Coupon from "../models/Coupon.js";
import AppError from "../utils/appError.js";
import asyncHandler from "express-async-handler";
import cloudinary from "../utils/cloudinary.js";
import streamifier from "streamifier";

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
    $or: searchFields.map((field) => ({
      [field]: { $regex: searchTerm, $options: "i" },
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
  if (!sortBy || !validFields.includes(sortBy)) {
    return defaultSort;
  }

  const order = sortOrder === "asc" ? 1 : -1;
  return { [sortBy]: order };
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

  const diffInDays = (end - start) / (1000 * 60 * 60 * 24);
  if (diffInDays > maxDays) {
    throw new AppError(`Date range cannot exceed ${maxDays} days`, 400);
  }

  if (end > now) {
    throw new AppError("End date cannot be in the future", 400);
  }

  return { start, end };
};

/**
 * Parse and validate numeric filter range
 */
const parseNumericRange = (min, max, fieldName) => {
  const parsedMin = min !== undefined ? Number(min) : undefined;
  const parsedMax = max !== undefined ? Number(max) : undefined;

  if (
    (parsedMin !== undefined && isNaN(parsedMin)) ||
    (parsedMax !== undefined && isNaN(parsedMax))
  ) {
    throw new AppError(`Invalid ${fieldName} range`, 400);
  }

  if (
    parsedMin !== undefined &&
    parsedMax !== undefined &&
    parsedMin > parsedMax
  ) {
    throw new AppError(
      `Minimum ${fieldName} cannot be greater than maximum ${fieldName}`,
      400
    );
  }

  const range = {};
  if (parsedMin !== undefined) range.$gte = parsedMin;
  if (parsedMax !== undefined) range.$lte = parsedMax;

  return range;
};

// ============================================================================
// DASHBOARD & ANALYTICS CONTROLLERS
// ============================================================================

/**
 * @desc    Get admin dashboard overview with enhanced metrics
 * @route   GET /api/admin/analytics/overview
 * @access  Private/Admin
 */
export const getDashboardOverview = asyncHandler(async (req, res, next) => {
  logger.info("Dashboard overview requested", { adminId: req.user?.id });

  const { period = "30d" } = req.query;

  const now = new Date();
  const startDate = new Date();

  switch (period) {
    case "7d":
      startDate.setDate(now.getDate() - 7);
      break;
    case "90d":
      startDate.setDate(now.getDate() - 90);
      break;
    case "365d":
      startDate.setDate(now.getDate() - 365);
      break;
    case "30d":
    default:
      startDate.setDate(now.getDate() - 30);
  }

  const [totalUsers, totalProducts, totalOrders, totalRevenueData, recentOrders, topSellingProducts] =
    await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
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
            avgOrderValue: { $avg: "$totalPrice" },
            paidOrders: { $sum: 1 },
          },
        },
      ]),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("user", "name email")
        .populate("orderItems.product", "name images"),
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
            totalQuantity: { $sum: "$orderItems.quantity" },
            totalRevenue: {
              $sum: {
                $multiply: ["$orderItems.quantity", "$orderItems.price"],
              },
            },
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 },
      ]),
    ]);

  const revenueStats = totalRevenueData[0] || {
    totalRevenue: 0,
    avgOrderValue: 0,
    paidOrders: 0,
  };

  res.status(200).json({
    success: true,
    data: {
      stats: {
        users: totalUsers,
        products: totalProducts,
        orders: totalOrders,
        revenue: revenueStats.totalRevenue,
        avgOrderValue: revenueStats.avgOrderValue,
        paidOrders: revenueStats.paidOrders,
      },
      recentOrders,
      topSellingProducts,
      period,
    },
  });

  logger.info("Dashboard overview response sent", { adminId: req.user?.id });
});

/**
 * @desc    Get detailed sales analytics
 * @route   GET /api/admin/analytics/sales
 * @access  Private/Admin
 */
export const getSalesAnalytics = asyncHandler(async (req, res, next) => {
  logger.info("Sales analytics requested", {
    adminId: req.user?.id,
    query: req.query,
  });

  const { startDate, endDate, interval = "day" } = req.query;

  if (!startDate || !endDate) {
    return next(new AppError("Start date and end date are required", 400));
  }

  const { start, end } = validateDateRange(startDate, endDate, 365);

  let groupId;
  switch (interval) {
    case "month":
      groupId = { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } };
      break;
    case "week":
      groupId = {
        year: { $year: "$createdAt" },
        week: { $week: "$createdAt" },
      };
      break;
    case "day":
    default:
      groupId = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      };
  }

  const [salesTrend, paymentMethods, orderStatusDistribution] =
    await Promise.all([
      // Sales trend over time
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
            isPaid: true,
          },
        },
        {
          $group: {
            _id: groupId,
            totalRevenue: { $sum: "$totalPrice" },
            orderCount: { $sum: 1 },
            avgOrderValue: { $avg: "$totalPrice" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
      ]),

      // Payment method distribution
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: "$paymentMethod",
            count: { $sum: 1 },
            totalRevenue: { $sum: "$totalPrice" },
          },
        },
      ]),

      // Order status distribution
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

  res.status(200).json({
    success: true,
    data: {
      salesTrend,
      paymentMethods,
      orderStatusDistribution,
      dateRange: {
        start,
        end,
      },
    },
  });

  logger.info("Sales analytics response sent", {
    adminId: req.user?.id,
    startDate,
    endDate,
  });
});

/**
 * @desc    Get product statistics and analytics
 * @route   GET /api/admin/analytics/products
 * @access  Private/Admin
 */
export const getProductStats = asyncHandler(async (req, res, next) => {
  logger.info("Product statistics requested", {
    adminId: req.user?.id,
    query: req.query,
  });

  const { category, minPrice, maxPrice, minRating, maxRating } = req.query;

  const priceFilter =
    minPrice || maxPrice
      ? parseNumericRange(minPrice, maxPrice, "price")
      : undefined;
  const ratingFilter =
    minRating || maxRating
      ? parseNumericRange(minRating, maxRating, "rating")
      : undefined;

  const matchStage = {};

  if (category) {
    matchStage.category = category;
  }

  if (priceFilter) {
    matchStage.finalPrice = priceFilter;
  }

  if (ratingFilter) {
    matchStage["ratings.average"] = ratingFilter;
  }

  const [overview, categoryDistribution, topRatedProducts, lowStockProducts] =
    await Promise.all([
      // Overview stats
      Product.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            avgPrice: { $avg: "$finalPrice" },
            avgRating: { $avg: "$ratings.average" },
          },
        },
      ]),

      // Category distribution
      Product.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
            avgPrice: { $avg: "$finalPrice" },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // Top rated products
      Product.find(matchStage)
        .sort({ "ratings.average": -1, "ratings.totalReviews": -1 })
        .limit(10)
        .select("name category brand finalPrice ratings images"),

      // Low stock products
      Product.find({ ...matchStage, stock: { $lte: 5 } })
        .sort({ stock: 1 })
        .limit(10)
        .select("name category brand stock images"),
    ]);

  res.status(200).json({
    success: true,
    data: {
      overview: overview[0] || {
        totalProducts: 0,
        avgPrice: 0,
        avgRating: 0,
      },
      categoryDistribution,
      topRatedProducts,
      lowStockProducts,
    },
  });

  logger.info("Product statistics response sent", {
    adminId: req.user?.id,
    filters: req.query,
  });
});

/**
 * @desc    Get inventory analytics
 * @route   GET /api/admin/analytics/inventory
 * @access  Private/Admin
 */
export const getInventoryAnalytics = asyncHandler(async (req, res, next) => {
  logger.info("Inventory analytics requested", {
    adminId: req.user?.id,
    query: req.query,
  });

  const { lowStockThreshold = 5 } = req.query;
  const threshold = Number(lowStockThreshold) || 5;

  const [inventoryOverview, lowStockProducts, outOfStockProducts] =
    await Promise.all([
      // Inventory overview
      Product.aggregate([
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalStock: { $sum: "$stock" },
            avgStock: { $avg: "$stock" },
            outOfStockCount: {
              $sum: { $cond: [{ $eq: ["$stock", 0] }, 1, 0] },
            },
            lowStockCount: {
              $sum: { $cond: [{ $lt: ["$stock", threshold] }, 1, 0] },
            },
          },
        },
      ]),

      // Low stock products
      Product.find({ stock: { $gt: 0, $lt: threshold } })
        .sort({ stock: 1 })
        .select("name category brand stock images"),

      // Out of stock products
      Product.find({ stock: 0 })
        .sort({ updatedAt: -1 })
        .select("name category brand stock images"),
    ]);

  res.status(200).json({
    success: true,
    data: {
      overview: inventoryOverview[0] || {
        totalProducts: 0,
        totalStock: 0,
        avgStock: 0,
        outOfStockCount: 0,
        lowStockCount: 0,
      },
      lowStockProducts,
      outOfStockProducts,
      lowStockThreshold: threshold,
    },
  });

  logger.info("Inventory analytics response sent", {
    adminId: req.user?.id,
    lowStockThreshold: threshold,
  });
});

// ============================================================================
// USER MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * @desc    Get all users with advanced filtering, search and pagination
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
export const getAllUsers = asyncHandler(async (req, res, next) => {
  logger.info("Get all users requested", {
    adminId: req.user?.id,
    query: req.query,
  });

  const { search, role, isActive, sortBy, sortOrder } = req.query;

  const { page, limit, skip } = validatePagination(req.query);

  const query = {};

  // Search by name or email
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  // Filter by role
  if (role) {
    query.role = role;
  }

  // Filter by active status - note: User model uses 'active' field, not 'isActive'
  if (isActive !== undefined) {
    query.active = isActive === "true";
  }

  // Valid sort fields
  const validSortFields = ["name", "email", "createdAt", "updatedAt"];

  const sort = buildSortObject(sortBy, sortOrder, validSortFields, {
    createdAt: -1,
  });

  const [users, total] = await Promise.all([
    User.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select("-password -passwordChangedAt -__v"),
    User.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: users,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });

  logger.info("Users fetched", {
    adminId: req.user?.id,
    count: users.length,
    page,
  });
});

/**
 * @desc    Get single user by ID with details
 * @route   GET /api/admin/users/:id
 * @access  Private/Admin
 */
export const getUserById = asyncHandler(async (req, res, next) => {
  logger.info("Get user by id requested", {
    adminId: req.user?.id,
    userId: req.params.id,
  });

  const user = await User.findById(req.params.id).select("-password -__v");

  if (!user) {
    logger.warn("User not found", { userId: req.params.id });
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    success: true,
    data: user,
  });

  logger.info("User fetched", { adminId: req.user?.id, userId: req.params.id });
});

/**
 * @desc    Create a new user (admin only)
 * @route   POST /api/admin/users
 * @access  Private/Admin
 */
export const createUser = asyncHandler(async (req, res, next) => {
  logger.info("Create user requested", {
    adminId: req.user?.id,
    body: req.body,
  });

  const { name, email, role, password } = req.body;

  if (!name || !email || !password || !role) {
    return next(new AppError("Name, email, password and role are required", 400));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError("User with this email already exists", 400));
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    isEmailVerified: true,
  });

  res.status(201).json({
    success: true,
    data: user,
  });

  logger.info("User created by admin", {
    adminId: req.user?.id,
    userId: user._id,
  });
});

/**
 * @desc    Update existing user
 * @route   PATCH /api/admin/users/:id
 * @access  Private/Admin
 */
export const updateUser = asyncHandler(async (req, res, next) => {
  logger.info("Update user requested", {
    adminId: req.user?.id,
    userId: req.params.id,
  });

  const allowedFields = ["name", "email", "role"];
  const updateData = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });
  
  // Handle active status - map both 'active' and 'isActive' to 'active' field (User model uses 'active')
  if (req.body.active !== undefined) {
    updateData.active = req.body.active === "true" || req.body.active === true;
  } else if (req.body.isActive !== undefined) {
    updateData.active = req.body.isActive === "true" || req.body.isActive === true;
  }

  if (Object.keys(updateData).length === 0) {
    return next(new AppError("No valid fields provided for update", 400));
  }

  const user = await User.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  }).select("-password -__v");

  if (!user) {
    logger.warn("User not found for update", { userId: req.params.id });
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    success: true,
    data: user,
  });

  logger.info("User updated by admin", {
    adminId: req.user?.id,
    userId: req.params.id,
  });
});

/**
 * @desc    Delete user
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
export const deleteUser = asyncHandler(async (req, res, next) => {
  logger.info("Delete user requested", {
    adminId: req.user?.id,
    userId: req.params.id,
  });

  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    logger.warn("User not found for delete", { userId: req.params.id });
    return next(new AppError("User not found", 404));
  }

  res.status(204).json({
    success: true,
    data: null,
  });

  logger.info("User deleted by admin", {
    adminId: req.user?.id,
    userId: req.params.id,
  });
});

// ============================================================================
// PRODUCT MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * @desc    Get all products with advanced filtering, search and pagination
 * @route   GET /api/admin/products
 * @access  Private/Admin
 */
export const getAllProducts = asyncHandler(async (req, res, next) => {
  logger.info("Get all products requested", {
    adminId: req.user?.id,
    query: req.query,
  });

  const {
    search,
    category,
    brand,
    isActive,
    minPrice,
    maxPrice,
    sortBy,
    sortOrder,
  } = req.query;

  const { page, limit, skip } = validatePagination(req.query);

  const query = {};

  // Search by name or description
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  // Filter by category
  if (category) {
    query.category = category;
  }

  // Filter by brand
  if (brand) {
    query.brand = brand;
  }

  // Filter by active status - note: Product model uses 'isActive' field
  if (isActive !== undefined) {
    query.isActive = isActive === "true";
  }

  // Price range
  if (minPrice || maxPrice) {
    query.finalPrice = parseNumericRange(minPrice, maxPrice, "price");
  }

  // Valid sort fields
  const validSortFields = [
    "name",
    "price",
    "createdAt",
    "updatedAt",
    "salesCount",
  ];

  const sort = buildSortObject(sortBy, sortOrder, validSortFields, {
    createdAt: -1,
  });

  const [products, total] = await Promise.all([
    Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Product.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: products,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });

  logger.info("Admin fetched products", {
    count: products.length,
    page,
    limit,
    filters: req.query,
  });
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
  const numericStock = Number(stock);
  if (
    Number.isNaN(numericStock) ||
    numericStock < 0 ||
    !Number.isInteger(numericStock)
  ) {
    validationErrors.push("Stock must be a non-negative integer");
  }

  // Dynamic category validation from Product model enum
  if (category) {
    const categoryEnum = Product.schema.path("category")?.enumValues || [];
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
        new AppError("Provide either image files or image URLs, not both", 400)
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
    stock: numericStock,
    availability: numericStock > 0 ? "In Stock" : "Out of Stock",
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
 * @desc    Update product (Cloudinary + URL images + merge mode)
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

  // Fields allowed to update
  const allowedFields = [
    "name",
    "brand",
    "category",
    "originalPrice",
    "discountPercentage",
    "stock",
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
  // CATEGORY VALIDATION (dynamic from model enum)
  // ======================================================
  if (updateData.category) {
    const categoryEnum = Product.schema.path("category")?.enumValues || [];
    if (!categoryEnum.includes(updateData.category)) {
      return next(new AppError("Invalid product category", 400));
    }
  }

  // ======================================================
  // IMAGE MERGE MODE:
  // - Start from existing images
  // - Optionally remove some via imagesToRemove
  // - Optionally add new ones via files OR URLs (not both)
  // ======================================================
  let finalImages = Array.isArray(product.images) ? [...product.images] : [];

  // Handle imagesToRemove (URLs that should be removed from existing list)
  const { imagesToRemove } = req.body;
  if (imagesToRemove && Array.isArray(imagesToRemove)) {
    finalImages = finalImages.filter((img) => !imagesToRemove.includes(img));
  }

  // Case A: New files uploaded
  if (req.files && req.files.length > 0) {
    // No mixing allowed: if URLs also provided in this request, reject
    if (
      updateData.images &&
      Array.isArray(updateData.images) &&
      updateData.images.length > 0
    ) {
      return next(
        new AppError(
          "Provide either image files or image URLs when adding new images, not both",
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

    const uploaded = await Promise.all(uploadPromises);
    finalImages.push(...uploaded);
  }
  // Case B: New URLs provided in body (to append)
  else if (updateData.images && Array.isArray(updateData.images)) {
    const imageRegex = /\.(jpg|jpeg|png|webp|avif)$/i;

    for (const image of updateData.images) {
      if (!imageRegex.test(image)) {
        return next(new AppError(`Invalid image URL: ${image}`, 400));
      }
    }

    finalImages.push(...updateData.images);
  }

  if (!finalImages || finalImages.length === 0) {
    return next(new AppError("At least one image is required", 400));
  }

  updateData.images = finalImages;

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
    const numericStock = Number(updateData.stock);
    if (
      Number.isNaN(numericStock) ||
      numericStock < 0 ||
      !Number.isInteger(numericStock)
    ) {
      return next(new AppError("Stock must be a non-negative integer", 400));
    }

    updateData.stock = numericStock;
    updateData.availability =
      numericStock > 0 ? "In Stock" : "Out of Stock";
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
  if (updateData.category && updateData.category !== previousCategory) {
    logger.info("Product category changed", {
      productId: updatedProduct._id,
      from: previousCategory,
      to: updateData.category,
    });
    // Hook for cache invalidation / analytics refresh if needed
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
  logger.info("Delete product requested", {
    adminId: req.user?.id,
    productId: req.params.id,
  });

  const product = await Product.findByIdAndDelete(req.params.id);

  if (!product) {
    logger.warn("Product not found for delete", { productId: req.params.id });
    return next(new AppError("Product not found", 404));
  }

  res.status(204).json({
    success: true,
    data: null,
  });

  logger.info("Product deleted by admin", {
    adminId: req.user?.id,
    productId: req.params.id,
  });
});

/**
 * @desc    Get reviews for a specific product
 * @route   GET /api/admin/products/:id/reviews
 * @access  Private/Admin
 */
export const getProductReviews = asyncHandler(async (req, res, next) => {
  logger.info("Get product reviews requested", {
    adminId: req.user?.id,
    productId: req.params.id,
  });

  const product = await Product.findById(req.params.id).populate("reviews");

  if (!product) {
    logger.warn("Product not found for getting reviews", {
      productId: req.params.id,
    });
    return next(new AppError("Product not found", 404));
  }

  const reviews = await Review.find({ product: req.params.id }).populate(
    "user",
    "name email"
  );

  res.status(200).json({
    success: true,
    data: reviews,
  });

  logger.info("Product reviews fetched", {
    adminId: req.user?.id,
    productId: req.params.id,
  });
});

/**
 * @desc    Delete a specific review for a product
 * @route   DELETE /api/admin/products/:id/reviews
 * @access  Private/Admin
 */
export const deleteProductReview = asyncHandler(async (req, res, next) => {
  logger.info("Delete product review requested", {
    adminId: req.user?.id,
    productId: req.params.id,
  });

  const { reviewId } = req.body;

  if (!reviewId) {
    return next(new AppError("Review ID is required", 400));
  }

  const review = await Review.findOneAndDelete({
    _id: reviewId,
    product: req.params.id,
  });

  if (!review) {
    logger.warn("Review not found for delete", {
      productId: req.params.id,
      reviewId,
    });
    return next(new AppError("Review not found", 404));
  }

  // Update product rating stats after review deletion using Review model's static method
  // This ensures consistency with the model's rating calculation logic
  await Review.calculateAverageRatings(req.params.id, null);

  res.status(200).json({
    success: true,
    message: "Review deleted successfully",
  });

  logger.info("Product review deleted", {
    adminId: req.user?.id,
    productId: req.params.id,
    reviewId,
  });
});

// ============================================================================
// ORDER MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * @desc    Get all orders with advanced filtering and pagination
 * @route   GET /api/admin/orders
 * @access  Private/Admin
 */
export const getOrders = asyncHandler(async (req, res, next) => {
  logger.info("Get orders requested", {
    adminId: req.user?.id,
    query: req.query,
  });

  const {
    search,
    status,
    paymentMethod,
    isPaid,
    startDate,
    endDate,
    sortBy,
    sortOrder,
  } = req.query;

  const { page, limit, skip } = validatePagination(req.query);

  const query = {};

  if (status) {
    query.status = status;
  }

  if (paymentMethod) {
    query.paymentMethod = paymentMethod;
  }

  if (isPaid !== undefined) {
    query.isPaid = isPaid === "true";
  }

  if (startDate && endDate) {
    const { start, end } = validateDateRange(startDate, endDate, 365);
    query.createdAt = { $gte: start, $lte: end };
  }

  if (search) {
    query.$or = [
      { "shippingAddress.fullName": { $regex: search, $options: "i" } },
      { "shippingAddress.city": { $regex: search, $options: "i" } },
      { "shippingAddress.address": { $regex: search, $options: "i" } },
    ];
  }

  const validSortFields = ["createdAt", "totalPrice", "status"];
  const sort = buildSortObject(sortBy, sortOrder, validSortFields, {
    createdAt: -1,
  });

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("user", "name email")
      .populate("orderItems.product", "name images"),
    Order.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: orders,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });

  logger.info("Admin fetched orders", {
    count: orders.length,
    page,
    limit,
    filters: req.query,
  });
});

/**
 * @desc    Update order to delivered
 * @route   PUT /api/admin/orders/:id/deliver
 * @access  Private/Admin
 */
export const updateOrderToDelivered = asyncHandler(async (req, res, next) => {
  logger.info("Update order to delivered requested", {
    adminId: req.user?.id,
    orderId: req.params.id,
  });

  const order = await Order.findById(req.params.id);

  if (!order) {
    logger.warn("Order not found for delivery update", {
      orderId: req.params.id,
    });
    return next(new AppError("Order not found", 404));
  }

  if (order.status === "delivered") {
    return next(new AppError("Order is already marked as delivered", 400));
  }

  order.status = "delivered";
  order.isDelivered = true;
  order.deliveredAt = new Date();

  const updatedOrder = await order.save();

  res.status(200).json({
    success: true,
    data: updatedOrder,
  });

  logger.info("Order marked as delivered", {
    adminId: req.user?.id,
    orderId: req.params.id,
  });
});

/**
 * @desc    Mark order as paid
 * @route   PUT /api/admin/orders/:id/mark-paid
 * @access  Private/Admin
 */
export const markOrderAsPaid = asyncHandler(async (req, res, next) => {
  logger.info("Mark order as paid requested", {
    adminId: req.user?.id,
    orderId: req.params.id,
  });

  const order = await Order.findById(req.params.id);

  if (!order) {
    logger.warn("Order not found for payment update", {
      orderId: req.params.id,
    });
    return next(new AppError("Order not found", 404));
  }

  if (order.isPaid) {
    return next(new AppError("Order is already marked as paid", 400));
  }

  order.isPaid = true;
  order.paidAt = new Date();
  if (!order.status || order.status === "pending") {
    order.status = "paid";
  }

  const updatedOrder = await order.save();

  res.status(200).json({
    success: true,
    data: updatedOrder,
  });

  logger.info("Order marked as paid", {
    adminId: req.user?.id,
    orderId: req.params.id,
  });
});

/**
 * @desc    Update order status
 * @route   PUT /api/admin/orders/:id/status
 * @access  Private/Admin
 */
export const updateOrderStatus = asyncHandler(async (req, res, next) => {
  logger.info("Update order status requested", {
    adminId: req.user?.id,
    orderId: req.params.id,
    body: req.body,
  });

  const { status } = req.body;

  const validStatuses = ["pending", "paid", "shipped", "delivered", "cancelled", "refunded"];

  if (!status || !validStatuses.includes(status)) {
    return next(new AppError("Invalid or missing order status", 400));
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    logger.warn("Order not found for status update", {
      orderId: req.params.id,
    });
    return next(new AppError("Order not found", 404));
  }

  order.status = status;
  
  // Update related boolean fields based on status
  if (status === "delivered") {
    order.isDelivered = true;
    order.deliveredAt = new Date();
  } else if (status === "paid") {
    order.isPaid = true;
    order.paidAt = new Date();
  }
  
  const updatedOrder = await order.save();

  res.status(200).json({
    success: true,
    data: updatedOrder,
  });

  logger.info("Order status updated by admin", {
    adminId: req.user?.id,
    orderId: req.params.id,
    status,
  });
});

/**
 * @desc    Process refund for an order
 * @route   POST /api/admin/orders/:id/refund
 * @access  Private/Admin
 */
export const processRefund = asyncHandler(async (req, res, next) => {
  logger.info("Process refund requested", {
    adminId: req.user?.id,
    orderId: req.params.id,
    body: req.body,
  });

  const { refundAmount, reason } = req.body;

  if (!refundAmount || refundAmount <= 0) {
    return next(new AppError("Valid refund amount is required", 400));
  }

  if (!reason?.trim()) {
    return next(new AppError("Refund reason is required", 400));
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    logger.warn("Order not found for refund", { orderId: req.params.id });
    return next(new AppError("Order not found", 404));
  }

  if (!order.isPaid) {
    return next(new AppError("Cannot refund an unpaid order", 400));
  }

  if (refundAmount > order.totalPrice) {
    return next(
      new AppError("Refund amount cannot exceed the total order price", 400)
    );
  }

  order.refund = {
    isRefunded: true,
    amount: refundAmount,
    reason: reason.trim(),
    refundedAt: Date.now(),
  };

  const updatedOrder = await order.save();

  res.status(200).json({
    success: true,
    data: updatedOrder,
  });

  logger.info("Refund processed by admin", {
    adminId: req.user?.id,
    orderId: req.params.id,
    refundAmount,
  });
});

/**
 * @desc    Process order return
 * @route   PUT /api/admin/orders/:id/process-return
 * @access  Private/Admin
 */
export const processReturn = asyncHandler(async (req, res, next) => {
  logger.info("Process return requested", {
    adminId: req.user?.id,
    orderId: req.params.id,
    body: req.body,
  });

  const { returnReason, restock } = req.body;

  if (!returnReason?.trim()) {
    return next(new AppError("Return reason is required", 400));
  }

  const order = await Order.findById(req.params.id).populate(
    "orderItems.product"
  );

  if (!order) {
    logger.warn("Order not found for return processing", {
      orderId: req.params.id,
    });
    return next(new AppError("Order not found", 404));
  }

  if (order.returnStatus === "approved") {
    return next(new AppError("Order has already been returned", 400));
  }

  order.status = "refunded";
  order.returnStatus = "approved";
  order.returnRequestedAt = order.returnRequestedAt || new Date();

  if (restock === true || restock === "true") {
    // Restock the items
    for (const item of order.orderItems) {
      if (item.product) {
        const product = await Product.findById(item.product._id);
        if (product) {
          product.stock += item.quantity;
          await product.save();
        }
      }
    }
  }

  const updatedOrder = await order.save();

  res.status(200).json({
    success: true,
    data: updatedOrder,
  });

  logger.info("Order return processed by admin", {
    adminId: req.user?.id,
    orderId: req.params.id,
    restock,
  });
});

// ============================================================================
// COUPON MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * @desc    Create new coupon
 * @route   POST /api/admin/coupons
 * @access  Private/Admin
 */
export const createCoupon = asyncHandler(async (req, res, next) => {
  logger.info("Create coupon start", { userId: req.user?.id, body: req.body });

  const {
    code,
    type,
    discountPercentage,
    discountAmount,
    minCartValue,
    maxDiscountAmount,
    startDate,
    endDate,
    usageLimit,
    usageLimitPerUser,
    applicableCategories,
    applicableProducts,
    isActive,
  } = req.body;

  const errors = [];

  if (!code?.trim()) errors.push("Coupon code is required");
  
  // Map 'type' to 'discountType' (model uses 'discountType' with values 'fixed' or 'percent')
  const discountType = type === "percentage" ? "percent" : (type || "fixed");
  if (!discountType || !["percent", "fixed"].includes(discountType)) {
    errors.push("Valid discount type (percentage or fixed) is required");
  }

  // Map discountPercentage/discountAmount to discountValue (model uses single 'discountValue' field)
  let discountValue;
  if (discountType === "percent") {
    if (
      discountPercentage === undefined ||
      discountPercentage <= 0 ||
      discountPercentage > 100
    ) {
      errors.push("Valid discount percentage (1-100) is required");
    } else {
      discountValue = discountPercentage;
    }
  } else if (discountType === "fixed") {
    if (discountAmount === undefined || discountAmount <= 0) {
      errors.push("Valid fixed discount amount is required");
    } else {
      discountValue = discountAmount;
    }
  }

  // Map minCartValue to minPurchase
  const minPurchase = minCartValue !== undefined ? minCartValue : 0;
  if (minPurchase < 0) {
    errors.push("Minimum cart value cannot be negative");
  }

  // Map maxDiscountAmount to maxDiscount
  const maxDiscount = maxDiscountAmount !== undefined ? maxDiscountAmount : null;
  if (maxDiscount !== null && maxDiscount <= 0) {
    errors.push("Max discount amount must be greater than 0");
  }

  // Map startDate/endDate to validFrom/validTo
  let validFrom = startDate ? new Date(startDate) : new Date();
  let validTo = endDate ? new Date(endDate) : null;

  if (startDate && isNaN(validFrom.getTime())) {
    errors.push("Invalid start date");
  }

  if (endDate && isNaN(validTo.getTime())) {
    errors.push("Invalid end date");
  }

  if (validTo && validFrom > validTo) {
    errors.push("End date must be after start date");
  }

  if (!validTo) {
    errors.push("Valid to date (endDate) is required");
  }

  if (usageLimit !== undefined && usageLimit <= 0) {
    errors.push("Usage limit must be greater than 0");
  }

  // Map usageLimitPerUser to perUserLimit
  const perUserLimit = usageLimitPerUser !== undefined ? usageLimitPerUser : null;
  if (perUserLimit !== null && perUserLimit <= 0) {
    errors.push("Usage limit per user must be greater than 0");
  }

  if (errors.length > 0) {
    return next(new AppError(errors.join("; "), 400));
  }

  const existingCoupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
  if (existingCoupon) {
    return next(new AppError("Coupon code already exists", 400));
  }

  const coupon = await Coupon.create({
    code: code.trim().toUpperCase(),
    discountType,
    discountValue,
    minPurchase,
    maxDiscount,
    validFrom,
    validTo,
    usageLimit,
    perUserLimit,
    applicableProducts, // Note: applicableCategories is not in the model schema, removed
    isActive: isActive !== undefined ? isActive : true,
  });

  res.status(201).json({
    success: true,
    data: coupon,
  });

  logger.info("Coupon created", { id: coupon._id, userId: req.user?.id });
});

/**
 * @desc    Get all coupons with filtering and pagination
 * @route   GET /api/admin/coupons
 * @access  Private/Admin
 */
export const getCoupons = asyncHandler(async (req, res, next) => {
  logger.info("Get coupons start", {
    userId: req.user?.id,
    query: req.query,
  });

  const { search, isActive, sortBy, sortOrder } = req.query;
  const { page, limit, skip } = validatePagination(req.query);

  const query = {};

  if (search) {
    query.code = { $regex: search, $options: "i" };
  }

  if (isActive !== undefined) {
    query.isActive = isActive === "true";
  }

  // Map sortBy to model field names if needed
  let mappedSortBy = sortBy;
  if (sortBy === "startDate") mappedSortBy = "validFrom";
  if (sortBy === "endDate") mappedSortBy = "validTo";
  
  const validSortFields = ["code", "createdAt", "validFrom", "validTo"];
  const sort = buildSortObject(mappedSortBy, sortOrder, validSortFields, {
    createdAt: -1,
  });

  const [coupons, total] = await Promise.all([
    Coupon.find(query).sort(sort).skip(skip).limit(limit),
    Coupon.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: coupons,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });

  logger.info("Coupons fetched", {
    count: coupons.length,
    page,
    limit,
    filters: req.query,
  });
});

/**
 * @desc    Get single coupon by ID
 * @route   GET /api/admin/coupons/:id
 * @access  Private/Admin
 */
export const getCoupon = asyncHandler(async (req, res, next) => {
  logger.info("Get coupon start", {
    userId: req.user?.id,
    id: req.params.id,
  });

  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    logger.warn("Coupon not found", { id: req.params.id });
    return next(new AppError("Coupon not found", 404));
  }

  res.status(200).json({
    success: true,
    data: coupon,
  });

  logger.info("Coupon fetched", { id: req.params.id, userId: req.user?.id });
});

/**
 * @desc    Update coupon
 * @route   PATCH /api/admin/coupons/:id
 * @access  Private/Admin
 */
export const updateCoupon = asyncHandler(async (req, res, next) => {
  logger.info("Update coupon start", {
    userId: req.user?.id,
    id: req.params.id,
    body: req.body,
  });

  const {
    type,
    discountPercentage,
    discountAmount,
    minCartValue,
    maxDiscountAmount,
    startDate,
    endDate,
    usageLimit,
    usageLimitPerUser,
    applicableCategories,
    applicableProducts,
    isActive,
  } = req.body;

  const errors = [];
  const updateData = {};

  // Get existing coupon to check current discountType if type is not being updated
  const existingCoupon = await Coupon.findById(req.params.id);
  if (!existingCoupon) {
    return next(new AppError("Coupon not found", 404));
  }

  // Map 'type' to 'discountType' (model uses 'discountType' with values 'fixed' or 'percent')
  let discountType = existingCoupon.discountType;
  if (type !== undefined) {
    const mappedType = type === "percentage" ? "percent" : type;
    if (!["percent", "fixed"].includes(mappedType)) {
      errors.push("Invalid discount type");
    } else {
      discountType = mappedType;
      updateData.discountType = mappedType;
    }
  }

  // Map discountPercentage/discountAmount to discountValue (model uses single 'discountValue' field)
  if (discountPercentage !== undefined) {
    if (discountType !== "percent") {
      errors.push("discountPercentage only valid for percentage type");
    } else if (discountPercentage <= 0 || discountPercentage > 100) {
      errors.push("Discount percentage must be between 1 and 100");
    } else {
      updateData.discountValue = discountPercentage;
    }
  }

  if (discountAmount !== undefined) {
    if (discountType !== "fixed") {
      errors.push("discountAmount only valid for fixed type");
    } else if (discountAmount <= 0) {
      errors.push("Discount amount must be greater than 0");
    } else {
      updateData.discountValue = discountAmount;
    }
  }

  // Map minCartValue to minPurchase
  if (minCartValue !== undefined) {
    if (minCartValue < 0) {
      errors.push("Minimum cart value cannot be negative");
    } else {
      updateData.minPurchase = minCartValue;
    }
  }

  // Map maxDiscountAmount to maxDiscount
  if (maxDiscountAmount !== undefined) {
    if (maxDiscountAmount <= 0) {
      errors.push("Max discount amount must be greater than 0");
    } else {
      updateData.maxDiscount = maxDiscountAmount;
    }
  }

  // Map startDate/endDate to validFrom/validTo
  if (startDate !== undefined) {
    const validFrom = new Date(startDate);
    if (isNaN(validFrom.getTime())) {
      errors.push("Invalid start date");
    } else {
      updateData.validFrom = validFrom;
    }
  }

  if (endDate !== undefined) {
    const validTo = new Date(endDate);
    if (isNaN(validTo.getTime())) {
      errors.push("Invalid end date");
    } else {
      updateData.validTo = validTo;
    }
  }

  // Validate date range
  const validFrom = updateData.validFrom || existingCoupon.validFrom;
  const validTo = updateData.validTo || existingCoupon.validTo;
  if (validFrom && validTo && validFrom > validTo) {
    errors.push("End date must be after start date");
  }

  if (usageLimit !== undefined) {
    if (usageLimit <= 0) {
      errors.push("Usage limit must be greater than 0");
    } else {
      updateData.usageLimit = usageLimit;
    }
  }

  // Map usageLimitPerUser to perUserLimit
  if (usageLimitPerUser !== undefined) {
    if (usageLimitPerUser <= 0) {
      errors.push("Usage limit per user must be greater than 0");
    } else {
      updateData.perUserLimit = usageLimitPerUser;
    }
  }

  // Note: applicableCategories is not in the model schema, ignore it
  if (applicableCategories !== undefined) {
    logger.warn("applicableCategories field ignored - not in model schema", {
      couponId: req.params.id,
    });
  }

  if (applicableProducts !== undefined) {
    updateData.applicableProducts = applicableProducts;
  }

  if (isActive !== undefined) {
    updateData.isActive = isActive;
  }

  if (errors.length > 0) {
    return next(new AppError(errors.join("; "), 400));
  }

  // Only update if there's data to update
  if (Object.keys(updateData).length === 0) {
    return next(new AppError("No valid fields provided for update", 400));
  }

  const coupon = await Coupon.findByIdAndUpdate(req.params.id, updateData, {
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

  logger.info("Coupon updated", { id: req.params.id, userId: req.user?.id });
});

/**
 * @desc    Delete coupon
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
