// File: server/controllers/cartController.js

import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Coupon from "../models/Coupon.js";
import AppError from "../utils/appError.js";
import asyncHandler from "express-async-handler";
import { logger } from "../middleware/logger.js";

// Configuration
const CART_CONFIG = {
  MIN_QUANTITY: 1,
  MAX_QUANTITY: 10,
};

/* ----------------------- Helper Functions ----------------------- */

function normalizeObjectId(value) {
  if (!value) return null;
  let id = value;
  if (typeof value === "object" && value._id) id = value._id;
  const str = String(id);
  if (!mongoose.Types.ObjectId.isValid(str)) return null;
  return str;
}

function validateQuantity(quantity, fieldName = "quantity") {
  const qty = Number(quantity);
  if (!Number.isFinite(qty)) {
    throw new AppError(`${fieldName} must be a valid number`, 400);
  }
  if (!Number.isInteger(qty)) {
    throw new AppError(`${fieldName} must be an integer`, 400);
  }
  if (qty < CART_CONFIG.MIN_QUANTITY || qty > CART_CONFIG.MAX_QUANTITY) {
    throw new AppError(
      `${fieldName} must be between ${CART_CONFIG.MIN_QUANTITY} and ${CART_CONFIG.MAX_QUANTITY}`,
      400
    );
  }
  return qty;
}

async function getOrCreateCart(userId, session = null) {
  if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
    throw new AppError("Valid user ID is required", 400);
  }

  const options = session ? { session } : {};

  let cart = await Cart.findOne({ user: userId }, null, options)
    .populate("items.product", "name finalPrice image stock")
    .populate("coupon", "code discountType discountValue minPurchase maxDiscount validFrom validTo isActive usageLimit timesUsed applicableProducts excludedProducts");

  if (!cart) {
    cart = new Cart({ user: userId, items: [] });
    await cart.save(options);
    
    // After creating a new cart, we need to refetch it with population
    cart = await Cart.findById(cart._id, null, options)
      .populate("items.product", "name finalPrice image stock")
      .populate("coupon", "code discountType discountValue minPurchase maxDiscount validFrom validTo isActive usageLimit timesUsed applicableProducts excludedProducts");
  }

  if (String(cart.user) !== String(userId)) {
    throw new AppError("Unauthorized access to cart", 403);
  }

  return cart;
}

/**
 * Compute totals for cart (preview only, no DB updates)
 */
function computeCartTotals(cart) {
  if (!cart) {
    throw new AppError("Cart is required for total calculation", 500);
  }

  const items = [];
  let subtotal = 0;
  const warnings = [];

  for (const cartItem of cart.items) {
    const product = cartItem.product;
    const qty = Number(cartItem.quantity) || 0;

    if (!product) {
      warnings.push({
        type: "product",
        productId: String(cartItem.product),
        message: "Product no longer available",
      });
      continue;
    }

    const unitPrice = Number(product.finalPrice || 0);
    const lineTotal = unitPrice * qty;

    items.push({
      product: {
        _id: normalizeObjectId(product._id),
        name: product.name,
        image: product.image,
      },
      quantity: qty,
      unitPrice,
      lineTotal,
      availableStock: product.stock,
    });

    subtotal += lineTotal;

    if (product.stock != null && product.stock < qty) {
      warnings.push({
        type: "stock",
        productId: String(product._id),
        message: `Only ${product.stock} units available`,
        requestedQty: qty,
        availableQty: product.stock,
      });
    }
  }

  let discount = 0;
  let couponSummary = null;
  let couponError = null;

  if (cart.coupon) {
    const coupon = cart.coupon;
    const now = new Date();
    const basicValidity = coupon.isCurrentlyValid(now);

    if (!basicValidity.valid) {
      couponError = basicValidity.reason;
    } else if (coupon.minPurchase && subtotal < coupon.minPurchase) {
      couponError = `Minimum order amount for this coupon is ${coupon.minPurchase.toFixed(
        2
      )}`;
    } else {
      // product-level applicability
      const productIds = items.map((it) => it.product._id);
      const applicability = coupon.isApplicableToProducts(productIds);

      if (!applicability.valid) {
        couponError = applicability.reason;
      } else {
        discount = coupon.computeDiscount(subtotal);
        couponSummary = {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discountAmount: discount,
        };
      }
    }
  }

  const finalPrice = Math.max(0, subtotal - discount);

  return {
    items,
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    finalPrice: Number(finalPrice.toFixed(2)),
    coupon: couponSummary,
    couponError,
    warnings: warnings.length ? warnings : undefined,
  };
}

/* ----------------------- Controllers ----------------------- */

/**
 * GET /api/cart
 * Get current user's cart with totals
 */
export const getCart = asyncHandler(async (req, res) => {
  logger.info("Get cart", { userId: req.user._id });

  const cart = await getOrCreateCart(req.user._id);

  const totals = computeCartTotals(cart);

  res.status(200).json({
    success: true,
    data: {
      cart,
      totals,
    },
  });
});

/**
 * POST /api/cart
 * Add product to cart or increment quantity
 * body: { productId, quantity }
 */
export const addToCart = asyncHandler(async (req, res) => {
  logger.info("Add to cart", { userId: req.user._id });

  const rawProductId = req.body.productId || req.body.product;
  const productId = normalizeObjectId(rawProductId);
  if (!productId) {
    throw new AppError("Valid product ID is required", 400);
  }

  const quantity = validateQuantity(req.body.quantity ?? 1);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const product = await Product.findById(productId)
      .select("name finalPrice image stock")
      .session(session);

    if (!product) {
      throw new AppError("Product not found", 404);
    }

    if (product.stock != null && product.stock < quantity) {
      throw new AppError("Requested quantity exceeds available stock", 400);
    }

    const cart = await getOrCreateCart(req.user._id, session);

    let existing = cart.items.find(
      (item) => normalizeObjectId(item.product) === productId
    );

    if (!existing) {
      cart.items.push({
        product: product._id,
        quantity,
      });
    } else {
      const newQty = existing.quantity + quantity;
      existing.quantity = Math.min(CART_CONFIG.MAX_QUANTITY, newQty);
    }

    await cart.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Re-load with population for response
    const populatedCart = await getOrCreateCart(req.user._id);
    const totals = computeCartTotals(populatedCart);

    res.status(200).json({
      success: true,
      message: "Product added to cart",
      data: {
        cart: populatedCart,
        totals,
      },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

/**
 * PATCH /api/cart/:productId
 * Update cart item quantity
 * body: { quantity }
 */
export const updateCartItem = asyncHandler(async (req, res) => {
  logger.info("Update cart item", { userId: req.user._id });

  const rawProductId = req.params.productId || req.body.productId || req.body.product;
  const productId = normalizeObjectId(rawProductId);
  if (!productId) {
    throw new AppError("Valid product ID is required", 400);
  }

  const quantity = validateQuantity(req.body.quantity);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const cart = await getOrCreateCart(req.user._id, session);

    const item = cart.items.find(
      (it) => normalizeObjectId(it.product) === productId
    );

    if (!item) {
      throw new AppError("Product not found in cart", 404);
    }

    item.quantity = quantity;

    await cart.save({ session });
    await session.commitTransaction();
    session.endSession();

    const populatedCart = await getOrCreateCart(req.user._id);
    const totals = computeCartTotals(populatedCart);

    res.status(200).json({
      success: true,
      message: "Cart item updated",
      data: {
        cart: populatedCart,
        totals,
      },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

/**
 * DELETE /api/cart/:productId
 * Remove item from cart
 */
export const removeFromCart = asyncHandler(async (req, res) => {
  logger.info("Remove from cart", { userId: req.user._id });

  const rawProductId = req.params.productId || req.body.productId || req.body.product;
  const productId = normalizeObjectId(rawProductId);
  if (!productId) {
    throw new AppError("Valid product ID is required", 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const cart = await getOrCreateCart(req.user._id, session);

    const originalLength = cart.items.length;
    cart.items = cart.items.filter(
      (it) => normalizeObjectId(it.product) !== productId
    );

    if (cart.items.length === originalLength) {
      throw new AppError("Product not found in cart", 404);
    }

    await cart.save({ session });
    await session.commitTransaction();
    session.endSession();

    const populatedCart = await getOrCreateCart(req.user._id);
    const totals = computeCartTotals(populatedCart);

    res.status(200).json({
      success: true,
      message: "Product removed from cart",
      data: {
        cart: populatedCart,
        totals,
      },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

/**
 * DELETE /api/cart
 * Clear entire cart
 */
export const clearCart = asyncHandler(async (req, res) => {
  logger.info("Clear cart", { userId: req.user._id });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const cart = await getOrCreateCart(req.user._id, session);

    cart.items = [];
    cart.coupon = null;

    await cart.save({ session });
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Cart cleared",
      data: {
        cart,
        totals: {
          items: [],
          subtotal: 0,
          discount: 0,
          finalPrice: 0,
          coupon: null,
        },
      },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

/**
 * POST /api/cart/coupon
 * Apply coupon to cart (preview only; final validation at checkout)
 * body: { code }
 */
export const applyCoupon = asyncHandler(async (req, res) => {
  const rawCode = req.body.code || req.body.couponCode;
  if (!rawCode || typeof rawCode !== "string") {
    throw new AppError("Coupon code is required", 400);
  }

  const code = rawCode.trim().toUpperCase();

  logger.info("Apply coupon to cart", { userId: req.user._id, code });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const cart = await getOrCreateCart(req.user._id, session);

    if (!cart.items.length) {
      throw new AppError("Cart is empty. Add items before applying a coupon.", 400);
    }

    const coupon = await Coupon.findActiveByCode(code);
    if (!coupon) {
      throw new AppError("Coupon is invalid or expired", 400);
    }

    // Preview totals with this coupon (minPurchase/product restrictions)
    await cart
      .populate("items.product", "name finalPrice image stock")
      .execPopulate?.();

    // manual ensure populate in older mongoose
    const populatedCart = await Cart.findById(cart._id)
      .populate("items.product", "name finalPrice image stock")
      .session(session);

    const tempCart = populatedCart || cart;
    tempCart.coupon = coupon; // attach doc temporarily in memory
    const totals = computeCartTotals(tempCart);

    if (totals.couponError) {
      throw new AppError(`Coupon cannot be applied: ${totals.couponError}`, 400);
    }

    // If all good, save coupon reference (not a snapshot)
    cart.coupon = coupon._id;
    await cart.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Reload for response with populated coupon
    const finalCart = await getOrCreateCart(req.user._id);
    const finalTotals = computeCartTotals(finalCart);

    res.status(200).json({
      success: true,
      message: "Coupon applied to cart",
      data: {
        cart: finalCart,
        totals: finalTotals,
      },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

/**
 * DELETE /api/cart/coupon
 * Remove coupon from cart
 */
export const removeCoupon = asyncHandler(async (req, res) => {
  logger.info("Remove coupon from cart", { userId: req.user._id });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const cart = await getOrCreateCart(req.user._id, session);

    // Simply remove the coupon without any product ID validation
    cart.coupon = null;
    await cart.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Reload for response
    const finalCart = await getOrCreateCart(req.user._id);
    const totals = computeCartTotals(finalCart);

    res.status(200).json({
      success: true,
      message: "Coupon removed from cart",
      data: {
        cart: finalCart,
        totals,
      },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});
