// server/controllers/cartController.js

import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Coupon from "../models/Coupon.js";
import AppError from "../utils/appError.js";
import asyncHandler from "express-async-handler";
import { logger } from "../middleware/logger.js";

/**
 * Constants for quantity validation
 */
const MIN_Q = 1;
const MAX_Q = 10;

/**
 * Helper: Validate quantity
 */
function validateQuantity(q) {
  if (typeof q !== "number" || Number.isNaN(q)) {
    throw new AppError("Quantity must be a number", 400);
  }
  if (q < MIN_Q || q > MAX_Q) {
    throw new AppError(`Quantity must be between ${MIN_Q} and ${MAX_Q}`, 400);
  }
}

/**
 * Helper: Get cart document for a user, optionally creating it
 */
async function getCartDocument(userId, { createIfMissing = false } = {}) {
  let cart = await Cart.findOne({ user: userId })
    .populate("items.product", "name finalPrice image stock")
    .populate("coupon", "code discountType discountValue minPurchase maxDiscount");

  if (!cart && createIfMissing) {
    cart = await Cart.create({ user: userId, items: [] });
    cart = await Cart.findById(cart._id)
      .populate("items.product", "name finalPrice image stock");
  }

  return cart;
}

/**
 * Helper: Compute cart totals (price, discount, totalAfterDiscount)
 */
function computeTotals(cart) {
  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    return { totalPrice: 0, discount: 0, totalAfterDiscount: 0 };
  }

  // Total price using populated product data
  const totalPrice = cart.items.reduce((acc, item) => {
    const product = item.product;
    const price = product && typeof product.finalPrice === "number" ? product.finalPrice : 0;
    return acc + price * item.quantity;
  }, 0);

  let discount = 0;
  const coupon = cart.coupon;

  if (coupon && coupon.discountType && coupon.discountValue != null) {
    if (coupon.discountType === "percentage") {
      discount = totalPrice * (coupon.discountValue / 100);
      // Apply maxDiscount if provided
      if (typeof coupon.maxDiscount === "number") {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    } else {
      // fixed discount but respect maxDiscount if defined
      discount = coupon.discountValue;
      if (typeof coupon.maxDiscount === "number") {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    }

    if (coupon.minPurchase && totalPrice < coupon.minPurchase) {
      discount = 0; // coupon not applicable
    }
  }

  const totalAfterDiscount = Math.max(totalPrice - discount, 0);
  return { totalPrice, discount, totalAfterDiscount };
}

/**
 * @desc    Get current user's cart
 * @route   GET /api/cart
 * @access  Private
 */
export const getCart = asyncHandler(async (req, res) => {
  logger.info("Fetch cart start", { userId: req.user.id, route: req.originalUrl });

  const cart = await getCartDocument(req.user.id, { createIfMissing: false });

  if (!cart) {
    logger.info("No cart found, returning empty", { userId: req.user.id });
    return res.status(200).json({
      success: true,
      data: { items: [], totalPrice: 0, discount: 0, totalAfterDiscount: 0 },
    });
  }

  const totals = computeTotals(cart);

  res.status(200).json({
    success: true,
    data: {
      items: cart.items,
      coupon: cart.coupon || null,
      totalPrice: totals.totalPrice,
      discount: totals.discount,
      totalAfterDiscount: totals.totalAfterDiscount,
    },
  });

  logger.info("Fetched cart", {
    userId: req.user.id,
    itemsCount: cart.items.length,
    ...totals,
  });
});

/**
 * @desc    Add an item to cart
 * @route   POST /api/cart
 * @access  Private
 */
export const addToCart = asyncHandler(async (req, res, next) => {
  const { productId, quantity = 1 } = req.body;

  logger.info("Add to cart start", { userId: req.user.id, productId, quantity });

  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    logger.error("Invalid productId", { userId: req.user.id, productId });
    return next(new AppError("Invalid productId", 400));
  }

  validateQuantity(Number(quantity));

  const product = await Product.findById(productId).select("stock name");
  if (!product) {
    logger.error("Product not found", { productId });
    return next(new AppError("No product found with that ID", 404));
  }

  if (product.stock < quantity) {
    logger.error("Insufficient stock", { productId, stock: product.stock });
    return next(new AppError(`Not enough stock available. Only ${product.stock} left.`, 400));
  }

  let cart = await getCartDocument(req.user.id, { createIfMissing: true });

  const itemIndex = cart.items.findIndex(
    (item) => item.product._id?.toString() === productId || item.product.toString() === productId
  );

  if (itemIndex > -1) {
    const newQuantity = cart.items[itemIndex].quantity + Number(quantity);
    if (newQuantity > MAX_Q) {
      logger.error("Max quantity exceeded", { userId: req.user.id, productId });
      return next(new AppError(`Maximum quantity per product is ${MAX_Q}`, 400));
    }
    cart.items[itemIndex].quantity = newQuantity;
  } else {
    cart.items.push({ product: productId, quantity: Number(quantity) });
  }

  await cart.save();

  const populatedCart = await Cart.findById(cart._id)
    .populate("items.product", "name finalPrice image stock");

  logger.info("Added to cart successfully", { userId: req.user.id, productId, quantity });

  res.status(200).json({ success: true, data: populatedCart });
});

/**
 * @desc    Merge guest cart with logged-in user's cart
 * @route   POST /api/cart/merge
 * @access  Private
 */
export const mergeCart = asyncHandler(async (req, res, next) => {
  const { guestCartItems } = req.body;
  const userId = req.user.id;

  logger.info("Merge cart start", { userId, guestItemCount: guestCartItems?.length || 0 });

  if (!Array.isArray(guestCartItems)) {
    logger.error("Invalid guestCartItems payload", { userId });
    return next(new AppError("guestCartItems must be an array", 400));
  }

  let cart = await getCartDocument(userId, { createIfMissing: true });

  for (const guestItem of guestCartItems) {
    const { product, quantity } = guestItem;
    if (!product || !mongoose.Types.ObjectId.isValid(product)) continue;
    if (typeof quantity !== "number" || quantity <= 0) continue;

    const productDoc = await Product.findById(product).select("stock");
    if (!productDoc) continue;

    const existingIndex = cart.items.findIndex(
      (item) => item.product._id?.toString() === product || item.product.toString() === product
    );

    if (existingIndex > -1) {
      const newQuantity = Math.min(
        cart.items[existingIndex].quantity + quantity,
        Math.min(productDoc.stock, MAX_Q)
      );
      cart.items[existingIndex].quantity = newQuantity;
    } else {
      cart.items.push({ product, quantity: Math.min(quantity, Math.min(productDoc.stock, MAX_Q)) });
    }
  }

  await cart.save();

  const populatedCart = await Cart.findById(cart._id)
    .populate("items.product", "name finalPrice image stock");

  const totals = computeTotals(populatedCart);

  logger.info("Merged guest cart successfully", { userId, mergedCount: guestCartItems.length });

  res.status(200).json({
    success: true,
    message: "Guest cart merged successfully",
    data: {
      items: populatedCart.items,
      totalPrice: totals.totalPrice,
      discount: totals.discount,
      totalAfterDiscount: totals.totalAfterDiscount,
    },
  });
});

/**
 * @desc    Remove an item from cart
 * @route   DELETE /api/cart/:productId
 * @access  Private
 */
export const removeFromCart = asyncHandler(async (req, res, next) => {
  const productId = req.params.productId;
  logger.info("Remove from cart start", { userId: req.user.id, productId });

  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    logger.error("Invalid productId", { productId });
    return next(new AppError("Invalid productId", 400));
  }

  const cart = await getCartDocument(req.user.id);
  if (!cart) return next(new AppError("No cart found for this user", 404));

  const itemIndex = cart.items.findIndex(
    (item) => item.product._id?.toString() === productId || item.product.toString() === productId
  );
  if (itemIndex === -1) return next(new AppError("Product not found in cart", 404));

  cart.items.splice(itemIndex, 1);
  await cart.save();

  const populatedCart = await Cart.findById(cart._id)
    .populate("items.product", "name finalPrice image stock");

  logger.info("Removed item from cart", { userId: req.user.id, productId });

  res.status(200).json({ success: true, data: populatedCart });
});

/**
 * @desc    Update quantity of an item in cart
 * @route   PATCH /api/cart/:productId
 * @access  Private
 */
export const updateCartItem = asyncHandler(async (req, res, next) => {
  const productId = req.params.productId;
  const { quantity } = req.body;

  logger.info("Update cart item start", { userId: req.user.id, productId, quantity });

  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    logger.error("Invalid productId", { productId });
    return next(new AppError("Invalid productId", 400));
  }

  validateQuantity(Number(quantity));

  const cart = await getCartDocument(req.user.id);
  if (!cart) return next(new AppError("No cart found for this user", 404));

  const itemIndex = cart.items.findIndex(
    (item) => item.product._id?.toString() === productId || item.product.toString() === productId
  );
  if (itemIndex === -1) return next(new AppError("Product not found in cart", 404));

  const product = await Product.findById(productId).select("stock");
  if (!product) return next(new AppError("Product not found", 404));
  if (product.stock < quantity) {
    return next(new AppError(`Not enough stock. Only ${product.stock} left.`, 400));
  }

  cart.items[itemIndex].quantity = Number(quantity);
  await cart.save();

  const populatedCart = await Cart.findById(cart._id)
    .populate("items.product", "name finalPrice image stock");

  logger.info("Updated cart item successfully", { userId: req.user.id, productId, quantity });

  res.status(200).json({ success: true, data: populatedCart });
});

/**
 * @desc    Apply coupon to cart
 * @route   POST /api/cart/coupon
 * @access  Private
 */
export const applyCoupon = asyncHandler(async (req, res, next) => {
  const couponCode = (req.body?.couponCode || req.body?.code || "").trim().toUpperCase();
  logger.info("Apply coupon start", { userId: req.user.id, couponCode });

  if (!couponCode) {
    logger.error("Coupon code missing", { userId: req.user.id });
    return next(new AppError("Coupon code is required", 400));
  }

  const coupon = await Coupon.isValidCoupon(couponCode);
  if (!coupon) return next(new AppError("Invalid or expired coupon", 400));

  const cart = await getCartDocument(req.user.id);
  if (!cart) return next(new AppError("No cart found for this user", 404));

  cart.coupon = coupon._id;
  await cart.save();

  logger.info("Applied coupon successfully", { userId: req.user.id, couponId: coupon._id });

  res.status(200).json({ success: true, message: "Coupon applied successfully" });
});

/**
 * @desc    Remove coupon from cart
 * @route   DELETE /api/cart/coupon
 * @access  Private
 */
export const removeCoupon = asyncHandler(async (req, res, next) => {
  logger.info("Remove coupon start", { userId: req.user.id });

  const cart = await getCartDocument(req.user.id);
  if (!cart) return next(new AppError("No cart found for this user", 404));

  cart.coupon = undefined;
  await cart.save();

  logger.info("Removed coupon successfully", { userId: req.user.id });

  res.status(200).json({ success: true, message: "Coupon removed successfully" });
});

/**
 * @desc    Clear entire cart
 * @route   DELETE /api/cart
 * @access  Private
 */
export const clearCart = asyncHandler(async (req, res) => {
  logger.info("Clear cart start", { userId: req.user.id });

  await Cart.findOneAndDelete({ user: req.user.id });

  logger.info("Cleared cart successfully", { userId: req.user.id });

  res.status(200).json({ success: true, data: { items: [], totalPrice: 0 } });
});
