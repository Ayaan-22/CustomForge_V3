// File: server/controllers/productController.js
import Product from "../models/Product.js";
import APIFeatures from "../utils/apiFeatures.js";
import AppError from "../utils/appError.js";
import asyncHandler from "express-async-handler";
import User from "../models/User.js";

/**
 * @desc    Public Product Controllers
 */

/**
 * @desc    Get all products with filtering, sorting, pagination
 * @route   GET /api/products
 * @access  Public
 */
export const getAllProducts = asyncHandler(async (req, res) => {
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
    return next(new AppError("No product found with that ID", 404));
  }

  res.status(200).json({
    success: true,
    data: product,
  });
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
  const { rating, comment, title } = req.body;

  if (!rating || !comment || !title) {
    return next(new AppError("Please provide rating, title and comment", 400));
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError("No product found with that ID", 404));
  }

  // Check if user already reviewed
  const alreadyReviewed = product.reviews.find(
    (r) => r.user.toString() === req.user.id.toString()
  );

  if (alreadyReviewed) {
    return next(new AppError("Product already reviewed", 400));
  }

  // Check if user purchased the product
  const hasPurchased = await Order.exists({
    user: req.user.id,
    "orderItems.product": req.params.id,
    isPaid: true,
  });

  const review = {
    user: req.user.id,
    name: req.user.name,
    rating: Number(rating),
    title,
    comment,
    verifiedPurchase: hasPurchased,
  };

  product.reviews.push(review);
  product.ratings.totalReviews = product.reviews.length;
  product.ratings.average =
    product.reviews.reduce((acc, item) => item.rating + acc, 0) /
    product.reviews.length;

  await product.save();

  res.status(201).json({
    success: true,
    message: "Review added",
  });
});

/**
 * @desc    Add product to wishlist
 * @route   POST /api/products/:id/wishlist
 * @access  Private
 */
export const addToWishlist = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError("No product found with that ID", 404));
  }

  await User.findByIdAndUpdate(req.user.id, {
    $addToSet: { wishlist: product._id },
  });

  res.status(200).json({
    success: true,
    message: "Product added to wishlist",
  });
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

  res.status(200).json({
    success: true,
    results: user.wishlist.length,
    data: user.wishlist,
  });
});

/**
 * @desc    Admin Product Controllers
 */

/**
 * @desc    Create new product
 * @route   POST /api/products
 * @access  Private/Admin
 */
export const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    category,
    brand,
    originalPrice,
    discountPercentage,
    stock,
    image,
  } = req.body;

  if (
    !name ||
    !category ||
    !brand ||
    !originalPrice ||
    !image ||
    stock === undefined
  ) {
    return next(new AppError("Missing required product fields", 400));
  }

  if (discountPercentage < 0 || discountPercentage > 100) {
    return next(new AppError("Discount must be between 0 and 100%", 400));
  }

  const finalPrice = parseFloat(
    (originalPrice - (originalPrice * discountPercentage) / 100).toFixed(2)
  );
  const availability = stock > 0 ? "In Stock" : "Out of Stock";

  const product = await Product.create({
    ...req.body,
    finalPrice,
    availability,
    user: req.user.id, // Track which admin created the product
  });

  res.status(201).json({
    success: true,
    data: product,
  });
});

/**
 * @desc    Update product
 * @route   PATCH /api/products/:id
 * @access  Private/Admin
 */
export const updateProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError("No product found with that ID", 404));
  }

  // Recalculate final price if price or discount changes
  if (req.body.originalPrice || req.body.discountPercentage) {
    const originalPrice = req.body.originalPrice || product.originalPrice;
    const discountPercentage =
      req.body.discountPercentage || product.discountPercentage;
    req.body.finalPrice = parseFloat(
      (originalPrice - (originalPrice * discountPercentage) / 100).toFixed(2)
    );
  }

  // Update availability if stock changes
  if (req.body.stock !== undefined) {
    req.body.availability = req.body.stock > 0 ? "In Stock" : "Out of Stock";
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    data: updatedProduct,
  });
});

/**
 * @desc    Delete product
 * @route   DELETE /api/products/:id
 * @access  Private/Admin
 */
export const deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError("No product found with that ID", 404));
  }

  await product.deleteOne();

  res.json({
    success: true,
    data: {},
  });
});

/**
 * @desc    Get all reviews of a product (admin only)
 * @route   GET /api/products/:id/reviews
 * @access  Private/Admin
 */
export const getProductReviews = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate({
    path: "reviews.user",
    select: "name email avatar",
  });

  if (!product) {
    return next(new AppError("No product found with that ID", 404));
  }

  res.status(200).json({
    success: true,
    count: product.reviews.length,
    data: product.reviews,
  });
});

/**
 * @desc    Delete a review from a product (admin only)
 * @route   DELETE /api/products/:productId/reviews/:reviewId
 * @access  Private/Admin
 */
export const deleteProductReview = asyncHandler(async (req, res, next) => {
  const { productId, reviewId } = req.params;

  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError("No product found with that ID", 404));
  }

  const reviewIndex = product.reviews.findIndex(
    (r) => r._id.toString() === reviewId
  );
  if (reviewIndex === -1) {
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
});
