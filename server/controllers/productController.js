// File: server/controllers/productController.js
import Product from "../models/Product.js";
import APIFeatures from "../utils/apiFeatures.js";
import AppError from "../utils/appError.js";
import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Review from "../models/Review.js";
import Order from "../models/Order.js";
import { logger } from "../middleware/logger.js";

/**
 * @desc    Public Product Controllers
 */

/**
 * @desc    Get all products with filtering, sorting, pagination
 * @route   GET /api/products
 * @access  Public
 */
export const getAllProducts = asyncHandler(async (req, res) => {
  logger.info("Fetching products", { route: req.originalUrl, method: req.method, query: req.query });
  // Execute query with advanced features
  const features = new APIFeatures(Product.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const products = await features.query;

  // Get count for pagination
  const countFeatures = new APIFeatures(
    Product.countDocuments(),
    req.query
  ).filter();

  const count = await countFeatures.query;

  res.status(200).json({
    success: true,
    count,
    results: products.length,
    data: products,
  });
  logger.info("Fetched products", { count, results: products.length });
});

/**
 * @desc    Get single product with reviews
 * @route   GET /api/products/:id
 * @access  Public
 */
export const getProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate({
    path: "reviews",
    select: "rating comment user createdAt",
    populate: {
      path: "user",
      select: "name avatar",
    },
  });

  if (!product) {
    logger.warn("Product not found", { id: req.params.id });
    return next(new AppError("No product found with that ID", 404));
  }

  res.status(200).json({
    success: true,
    data: product,
  });
  logger.info("Fetched product", { id: req.params.id });
});

/**
 * @desc    Get top rated products
 * @route   GET /api/products/top
 * @access  Public
 */
export const getTopProducts = asyncHandler(async (req, res) => {
  const products = await Product.find()
    .sort({ "ratings.average": -1 })
    .limit(5);

  res.status(200).json({
    success: true,
    data: products,
  });
});

/**
 * @desc    Get related products (same category)
 * @route   GET /api/products/:id/related
 * @access  Public
 */
export const getRelatedProducts = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    logger.warn("Product not found (related)", { id: req.params.id });
    return next(new AppError("No product found with that ID", 404));
  }

  const relatedProducts = await Product.find({
    category: product.category,
    _id: { $ne: product._id },
  }).limit(4);

  res.status(200).json({
    success: true,
    data: relatedProducts,
  });
  logger.info("Fetched related products", { id: req.params.id, results: relatedProducts.length });
});

/**
 * @desc    Search products by name/description
 * @route   GET /api/products/search
 * @access  Public
 */
export const searchProducts = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(200).json({
      success: true,
      data: [],
    });
  }

  const products = await Product.find({
    $text: { $search: q },
  });

  res.status(200).json({
    success: true,
    results: products.length,
    data: products,
  });
});

/**
 * @desc    Get all unique product categories
 * @route   GET /api/products/categories
 * @access  Public
 */
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Product.distinct("category");

  res.status(200).json({
    success: true,
    data: categories,
  });
});

/**
 * @desc    Get featured products
 * @route   GET /api/products/featured
 * @access  Public
 */
export const getFeaturedProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ featured: true }).limit(10);

  res.status(200).json({
    success: true,
    data: products,
  });
});

/**
 * @desc    Get products by category
 * @route   GET /api/products/category/:category
 * @access  Public
 */
export const getProductsByCategory = asyncHandler(async (req, res) => {
  const category = req.params.category;

  const products = await Product.find({ category });

  res.status(200).json({
    success: true,
    count: products.length,
    data: products,
  });
});

/**
 * @desc    Protected User Product Controllers
 */

/**
 * @desc    Create product review
 * @route   POST /api/products/:id/reviews
 * @access  Private
 */
export const createProductReview = asyncHandler(async (req, res, next) => {
  logger.info("Create review start", { productId: req.params.id, userId: req.user?.id });
  const { rating, comment, title } = req.body;

  if (!rating || !comment || !title) {
    return next(new AppError("Please provide rating, title and comment", 400));
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError("No product found with that ID", 404));
  }

  // Check if user already reviewed using the Review model directly
  const existingReview = await Review.findOne({
    user: req.user.id,
    product: req.params.id
  });

  if (existingReview) {
    logger.warn("Duplicate review attempt", { productId: req.params.id, userId: req.user?.id });
    return next(new AppError("Product already reviewed", 400));
  }

  // Check if user purchased the product
  const hasPurchased = await Order.exists({
    user: req.user.id,
    "orderItems.product": req.params.id,
    isPaid: true,
  });

  // Create new review using the Review model
  const review = await Review.create({
    user: req.user.id,
    product: req.params.id,
    rating: Number(rating),
    title,
    comment,
    verifiedPurchase: hasPurchased,
  });

  // The average rating will be updated automatically by the Review model's post-save hook

  res.status(201).json({
    success: true,
    message: "Review added",
    data: review
  });
  logger.info("Review created", { productId: req.params.id, reviewId: review._id, userId: req.user?.id });
});

/**
 * @desc    Add product to wishlist
 * @route   POST /api/products/:id/wishlist
 * @access  Private
 */
export const addToWishlist = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    logger.warn("Wishlist add product not found", { id: req.params.id, userId: req.user?.id });
    return next(new AppError("No product found with that ID", 404));
  }

  await User.findByIdAndUpdate(req.user.id, {
    $addToSet: { wishlist: product._id },
  });

  res.status(200).json({
    success: true,
    message: "Product added to wishlist",
  });
  logger.info("Wishlist added", { productId: req.params.id, userId: req.user?.id });
});

/**
 * @desc    Remove product from wishlist
 * @route   DELETE /api/products/:id/wishlist
 * @access  Private
 */
export const removeFromWishlist = asyncHandler(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, {
    $pull: { wishlist: req.params.id },
  });

  res.status(200).json({
    success: true,
    message: "Product removed from wishlist",
  });
  logger.info("Wishlist removed", { productId: req.params.id, userId: req.user?.id });
});

/**
 * @desc    Get wishlist products for the current user
 * @route   GET /api/products/wishlist
 * @access  Private
 */
export const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate({
    path: "wishlist",
    select: "name image finalPrice category availability",
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.status(200).json({
    success: true,
    results: user.wishlist.length,
    data: user.wishlist,
  });
  logger.info("Fetched wishlist", { userId: req.user?.id, results: user.wishlist.length });
});

