// File: server/controllers/productController.js
import Product from "../models/Product.js";
import APIFeatures from "../utils/apiFeatures.js";
import AppError from "../utils/appError.js";
import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Review from "../models/Review.js";
import Order from "../models/Order.js";
import { logger } from "../middleware/logger.js";
import mongoose from "mongoose";
import validator from 'validator';

/**
 * Enhanced input sanitization utility
 */
const sanitizeInput = (input, options = {}) => {
  const { allowHTML = false, maxLength = 1000 } = options;
  
  if (typeof input === 'string') {
    let sanitized = validator.trim(input);
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    return allowHTML ? sanitized : validator.escape(sanitized);
  }
  
  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item, options));
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    Object.keys(input).forEach(key => {
      sanitized[key] = sanitizeInput(input[key], options);
    });
    return sanitized;
  }
  
  return input;
};

/**
 * Query sanitization for APIFeatures
 */
const sanitizeQuery = (query) => {
  const allowedFilters = ['category', 'brand', 'price', 'ratings.average', 'stock', 'availability'];
  const sanitized = {};
  
  Object.keys(query).forEach(key => {
    if (allowedFilters.includes(key)) {
      sanitized[key] = sanitizeInput(query[key]);
    }
  });
  
  return sanitized;
};

/**
 * @desc    Public Product Controllers
 */

/**
 * @desc    Get all products with filtering, sorting, pagination
 * @route   GET /api/products
 * @access  Public
 */
export const getAllProducts = asyncHandler(async (req, res) => {
  // Sanitize query parameters
  const sanitizedQuery = sanitizeQuery(req.query);
  
  logger.info("Fetching products", { 
    route: req.originalUrl, 
    method: req.method, 
    query: Object.keys(sanitizedQuery) 
  });

  // Execute query with advanced features and security
  const features = new APIFeatures(
    Product.find({ isActive: true })
      .select('name category brand finalPrice images ratings stock availability')
      .lean(),
    sanitizedQuery
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const products = await features.query;

  // Get count for pagination
  const countFeatures = new APIFeatures(
    Product.countDocuments({ isActive: true }),
    sanitizedQuery
  ).filter();

  const count = await countFeatures.query;

  res.status(200).json({
    success: true,
    count,
    results: products.length,
    data: products,
  });
  
  logger.info("Fetched products successfully", { 
    count, 
    results: products.length 
  });
});

/**
 * @desc    Get single product with reviews
 * @route   GET /api/products/:id
 * @access  Public
 */
export const getProduct = asyncHandler(async (req, res, next) => {
  // Validate product ID format
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    logger.warn("Invalid product ID format", { id: req.params.id });
    return next(new AppError("Invalid product ID format", 400));
  }

  try {
    // Use optimized aggregation for better performance
    const product = await Product.aggregate([
      { $match: { 
        _id: new mongoose.Types.ObjectId(req.params.id),
        isActive: true 
      }},
      {
        $lookup: {
          from: "reviews",
          let: { productId: "$_id" },
          pipeline: [
            { $match: { 
              $expr: { $eq: ["$product", "$$productId"] },
              isActive: true 
            }},
            { $sort: { createdAt: -1 } },
            { $limit: 10 }, // Reduced limit for performance
            {
              $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user",
                pipeline: [
                  { $project: { name: 1, avatar: 1, verified: 1 } }
                ]
              }
            },
            { $unwind: "$user" },
            { 
              $project: { 
                rating: 1, 
                title: 1, 
                comment: 1, 
                createdAt: 1, 
                user: 1, 
                verifiedPurchase: 1,
                helpfulVotes: 1 
              } 
            }
          ],
          as: "reviews"
        }
      },
      {
        $lookup: {
          from: "games",
          localField: "_id",
          foreignField: "product",
          as: "gameDetails"
        }
      },
      {
        $lookup: {
          from: "prebuiltpcs",
          localField: "_id",
          foreignField: "product",
          as: "pcDetails"
        }
      },
      { $unwind: { path: "$gameDetails", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$pcDetails", preserveNullAndEmptyArrays: true } }
    ]);

    if (!product || product.length === 0) {
      logger.warn("Product not found", { id: req.params.id });
      return next(new AppError("No product found with that ID", 404));
    }

    res.status(200).json({
      success: true,
      data: product[0],
    });
    
    logger.info("Fetched product successfully", { id: req.params.id });
  } catch (error) {
    logger.error("Error fetching product", {
      error: error.message,
      id: req.params.id,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    return next(new AppError("Failed to fetch product", 500));
  }
});

/**
 * @desc    Get top rated products
 * @route   GET /api/products/top
 * @access  Public
 */
export const getTopProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ 
    isActive: true,
    "ratings.totalReviews": { $gte: 5 },
    "ratings.average": { $gte: 4.0 }
  })
    .select('name category brand finalPrice images ratings stock')
    .sort({ "ratings.average": -1, "ratings.totalReviews": -1 })
    .limit(10)
    .lean();

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
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new AppError("Invalid product ID format", 400));
  }

  const product = await Product.findById(req.params.id)
    .select('category brand')
    .lean();
    
  if (!product) {
    logger.warn("Product not found for related products", { id: req.params.id });
    return next(new AppError("No product found with that ID", 404));
  }

  const relatedProducts = await Product.find({
    category: product.category,
    _id: { $ne: product._id },
    isActive: true
  })
    .select('name category brand finalPrice images ratings')
    .limit(8)
    .lean();

  res.status(200).json({
    success: true,
    data: relatedProducts,
  });
  
  logger.info("Fetched related products", { 
    id: req.params.id, 
    results: relatedProducts.length 
  });
});

/**
 * @desc    Search products by name/description
 * @route   GET /api/products/search
 * @access  Public
 */
export const searchProducts = asyncHandler(async (req, res, next) => {
  const { q } = req.query;

  if (!q || q.trim().length < 2) {
    return next(new AppError("Search query must be at least 2 characters long", 400));
  }

  const sanitizedQuery = validator.escape(q.trim());
  
  if (sanitizedQuery.length < 2) {
    return next(new AppError("Search query must be at least 2 characters long", 400));
  }

  const products = await Product.find({
    $text: { $search: sanitizedQuery },
    isActive: true
  })
    .select('name category brand finalPrice images ratings')
    .limit(50)
    .lean();

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
  const categories = await Product.distinct("category", { isActive: true });

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
  const products = await Product.find({ 
    isFeatured: true, 
    isActive: true,
    stock: { $gt: 0 }
  })
    .select('name category brand finalPrice images ratings stock')
    .limit(12)
    .lean();

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
export const getProductsByCategory = asyncHandler(async (req, res, next) => {
  const category = validator.escape(req.params.category);
  
  // Validate category exists in enum
  const validCategories = Product.schema.path('category').enumValues;
  if (!validCategories.includes(category)) {
    return next(new AppError("Invalid category", 400));
  }

  const products = await Product.find({ 
    category, 
    isActive: true 
  })
    .select('name category brand finalPrice images ratings stock')
    .lean();

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
  // Sanitize input
  req.body = sanitizeInput(req.body, { maxLength: 1000 });
  
  logger.info("Create review start", { 
    productId: req.params.id, 
    userId: req.user?.id 
  });

  const { rating, comment, title, media } = req.body;

  // Enhanced input validation
  if (!rating || !comment || !title) {
    return next(new AppError("Please provide rating, title and comment", 400));
  }

  if (rating < 1 || rating > 5) {
    return next(new AppError("Rating must be between 1 and 5", 400));
  }

  if (title.length < 5 || title.length > 100) {
    return next(new AppError("Title must be between 5 and 100 characters", 400));
  }

  if (comment.length < 10 || comment.length > 1000) {
    return next(new AppError("Comment must be between 10 and 1000 characters", 400));
  }

  // Validate media URLs if provided
  if (media && Array.isArray(media)) {
    for (const url of media) {
      if (!validator.isURL(url) || !/\.(jpg|jpeg|png|gif|mp4|webm)$/i.test(url)) {
        return next(new AppError("Invalid media URL format", 400));
      }
    }
  }

  try {
    await Product.executeInTransaction(async (session) => {
      const product = await Product.findById(req.params.id).session(session);
      if (!product) {
        throw new AppError("No product found with that ID", 404);
      }

      // Check for existing review atomically
      const existingReview = await Review.findOne({
        user: req.user.id,
        product: req.params.id,
        isActive: true
      }).session(session);

      if (existingReview) {
        logger.warn("Duplicate review attempt", { 
          productId: req.params.id, 
          userId: req.user?.id 
        });
        throw new AppError("Product already reviewed", 400);
      }

      // Check if user purchased the product
      const hasPurchased = await Order.exists({
        user: req.user.id,
        "orderItems.product": req.params.id,
        isPaid: true,
      }).session(session);

      // Create new review
      const review = await Review.create([{
        user: req.user.id,
        product: req.params.id,
        rating: Number(rating),
        title,
        comment,
        verifiedPurchase: !!hasPurchased,
        media: media || [],
      }], { session });

      res.status(201).json({
        success: true,
        message: "Review added successfully",
        data: review[0]
      });
      
      logger.info("Review created successfully", { 
        productId: req.params.id, 
        reviewId: review[0]._id, 
        userId: req.user?.id 
      });
    });
  } catch (error) {
    logger.error("Review creation failed", { 
      error: error.message, 
      productId: req.params.id, 
      userId: req.user?.id,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    if (error instanceof AppError) {
      return next(error);
    }
    return next(new AppError("Failed to create review", 500));
  }
});

export const addToWishlist = asyncHandler(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new AppError("Invalid product ID format", 400));
  }

  try {
    await Product.executeInTransaction(async (session) => {
      const product = await Product.findById(req.params.id).session(session);
      if (!product) {
        logger.warn("Wishlist add product not found", { 
          id: req.params.id, 
          userId: req.user?.id 
        });
        throw new AppError("No product found with that ID", 404);
      }

      await User.findByIdAndUpdate(
        req.user.id, 
        { $addToSet: { wishlist: product._id } },
        { session, new: true }
      );
    });

    res.status(200).json({
      success: true,
      message: "Product added to wishlist",
    });
    
    logger.info("Wishlist added successfully", { 
      productId: req.params.id, 
      userId: req.user?.id 
    });

  } catch (error) {
    logger.error("Wishlist add failed", { 
      error: error.message, 
      productId: req.params.id, 
      userId: req.user?.id 
    });
    
    if (error instanceof AppError) {
      return next(error);
    }
    return next(new AppError("Failed to add to wishlist", 500));
  }
});

export const removeFromWishlist = asyncHandler(async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new AppError("Invalid product ID format", 400));
  }

  try {
    await Product.executeInTransaction(async (session) => {
      await User.findByIdAndUpdate(
        req.user.id, 
        { $pull: { wishlist: req.params.id } },
        { session, new: true }
      );
    });

    res.status(200).json({
      success: true,
      message: "Product removed from wishlist",
    });
    
    logger.info("Wishlist removed successfully", { 
      productId: req.params.id, 
      userId: req.user?.id 
    });

  } catch (error) {
    logger.error("Wishlist remove failed", { 
      error: error.message, 
      productId: req.params.id, 
      userId: req.user?.id 
    });
    return next(new AppError("Failed to remove from wishlist", 500));
  }
});