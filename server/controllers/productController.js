// File: server/controllers/productController.js
import Product from "../models/Product.js";
import APIFeatures from "../utils/apiFeatures.js";
import AppError from "../utils/appError.js";
import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Review from "../models/Review.js";
import Order from "../models/Order.js";

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

  // Check if user already reviewed using the Review model directly
  const existingReview = await Review.findOne({
    user: req.user.id,
    product: req.params.id
  });

  if (existingReview) {
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
});

/**
 * @desc    Create new product
 * @route   POST /api/products
 * @access  Private/Admin
 */
export const createProduct = asyncHandler(async (req, res, next) => {
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

  // Validate required fields
  const requiredFields = [
    { field: name, message: "Product name is required" },
    { field: category, message: "Category is required" },
    { field: brand, message: "Brand is required" },
    { field: originalPrice, message: "Original price is required" },
    { field: images, message: "At least one image is required" },
    { field: description, message: "Description is required" },
    { field: sku, message: "SKU is required" }
  ];

  for (const { field, message } of requiredFields) {
    if (!field || (Array.isArray(field) && field.length === 0)) {
      return next(new AppError(message, 400));
    }
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
    salesCount: 0,
    user: req.user.id
  });

  res.status(201).json({
    success: true,
    data: product
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
  if (updateData.originalPrice || updateData.discountPercentage !== undefined) {
    const originalPrice = updateData.originalPrice || product.originalPrice;
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

  res.status(204).json({
    success: true,
    data: null
  });
});

/**
 * @desc    Get all reviews of a product (admin only)
 * @route   GET /api/products/:id/reviews
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
