// File: server/controllers/orderController.js
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Cart from "../models/Cart.js";
import Coupon from "../models/Coupon.js";
import AppError from "../utils/appError.js";
import asyncHandler from "express-async-handler";
import { logger } from "../middleware/logger.js";
import Email from "../utils/email.js";

const ORDER_CONFIG = {
  FREE_SHIPPING_THRESHOLD: 100,
  FLAT_SHIPPING_RATE: 10,
  TAX_RATE: 0.1, // 10%
  RETURN_WINDOW_DAYS: 30,
  MAX_ORDER_ITEMS: 50,
};

/* ----------------------- Helper Functions ----------------------- */

function validateShippingAddress(address) {
  if (!address) {
    throw new AppError("Shipping address is required", 400);
  }

  const required = ["fullName", "address", "city", "state", "postalCode", "country"];
  for (const field of required) {
    if (!address[field] || String(address[field]).trim().length === 0) {
      throw new AppError(`Shipping address ${field} is required`, 400);
    }
  }
}

function calculateOrderPrices(itemsPrice, discountAmount = 0) {
  const subtotal = Number(itemsPrice) || 0;
  const discount = Number(discountAmount) || 0;

  const priceAfterDiscount = Math.max(0, subtotal - discount);

  const shippingPrice =
    priceAfterDiscount >= ORDER_CONFIG.FREE_SHIPPING_THRESHOLD
      ? 0
      : ORDER_CONFIG.FLAT_SHIPPING_RATE;

  const taxPrice = Number((priceAfterDiscount * ORDER_CONFIG.TAX_RATE).toFixed(2));
  const totalPrice = Number(
    (priceAfterDiscount + shippingPrice + taxPrice).toFixed(2)
  );

  return {
    itemsPrice: Number(subtotal.toFixed(2)),
    discountAmount: Number(discount.toFixed(2)),
    shippingPrice: Number(shippingPrice.toFixed(2)),
    taxPrice,
    totalPrice,
  };
}

function validateOrderOwnership(order, userId, userRole) {
  if (!order) {
    throw new AppError("Order not found", 404);
  }

  const orderUserId = String(order.user._id || order.user);
  const requestUserId = String(userId);

  if (orderUserId !== requestUserId && userRole !== "admin") {
    throw new AppError("Not authorized to access this order", 403);
  }
}

function generateIdempotencyKey(userId, cartId) {
  return `order_${userId}_${cartId}_${Date.now()}`;
}

/* ---------------- Coupon validation at checkout ---------------- */

async function validateCouponAtCheckout({ couponDoc, userId, itemsPrice, orderItems, session }) {
  if (!couponDoc) {
    return { discountAmount: 0, couponApplied: null };
  }

  // 1. Basic validity (active, dates, global usage)
  const { valid, reason } = couponDoc.isCurrentlyValid(new Date());
  if (!valid) {
    throw new AppError(`Coupon is not valid: ${reason}`, 400);
  }

  // 2. Min purchase
  if (couponDoc.minPurchase && itemsPrice < couponDoc.minPurchase) {
    throw new AppError(
      `Order does not meet the minimum purchase amount of ${couponDoc.minPurchase.toFixed(
        2
      )}`,
      400
    );
  }

  // 3. Product restrictions
  const productIds = orderItems.map((item) => item.product);
  const applicability = couponDoc.isApplicableToProducts(productIds);
  if (!applicability.valid) {
    throw new AppError(applicability.reason, 400);
  }

  // 4. Per-user usage limit (based on past successful orders)
  if (couponDoc.perUserLimit) {
    const userUsageCount = await Order.countDocuments(
      {
        user: userId,
        "couponApplied.code": couponDoc.code,
        status: { $ne: "cancelled" },
      }
    ).session?.(session) || await Order.countDocuments({
      user: userId,
      "couponApplied.code": couponDoc.code,
      status: { $ne: "cancelled" },
    });

    if (userUsageCount >= couponDoc.perUserLimit) {
      throw new AppError("You have already used this coupon the maximum allowed times", 400);
    }
  }

  // 5. Compute discount
  const discountAmount = couponDoc.computeDiscount(itemsPrice);

  const couponApplied = {
    code: couponDoc.code,
    discountType: couponDoc.discountType,
    discountValue: couponDoc.discountValue,
    discountAmount: Number(discountAmount.toFixed(2)),
  };

  return { discountAmount, couponApplied };
}

/* ----------------------- Controllers ----------------------- */

/**
 * POST /api/orders
 * Create new order from cart
 */
export const createOrder = asyncHandler(async (req, res) => {
  logger.info("Create order request", { userId: req.user._id });

  const { shippingAddress, paymentMethod = "stripe", idempotencyKey } = req.body;

  validateShippingAddress(shippingAddress);

  const validPaymentMethods = ["stripe", "paypal", "cod"];
  if (!validPaymentMethods.includes(paymentMethod)) {
    throw new AppError("Invalid payment method", 400);
  }

  // Check idempotency
  if (idempotencyKey) {
    const existingOrder = await Order.findByIdempotencyKey(idempotencyKey);
    if (existingOrder) {
      return res.status(200).json({
        success: true,
        data: existingOrder,
        message: "Order already exists",
        duplicate: true,
      });
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Load cart with products and coupon document
    const cart = await Cart.findOne({ user: req.user._id })
      .populate("items.product", "name images finalPrice stock")
      .populate(
        "coupon",
        "code discountType discountValue minPurchase maxDiscount validFrom validTo isActive usageLimit timesUsed perUserLimit applicableProducts excludedProducts"
      )
      .session(session);

    if (!cart || !cart.items || cart.items.length === 0) {
      throw new AppError("Cart is empty. Please add items before checkout.", 400);
    }

    if (cart.items.length > ORDER_CONFIG.MAX_ORDER_ITEMS) {
      throw new AppError(
        `Cannot create order with more than ${ORDER_CONFIG.MAX_ORDER_ITEMS} items`,
        400
      );
    }

    // 2. Build order items & verify stock
    const orderItems = [];
    const stockUpdates = [];
    const outOfStock = [];
    let itemsPrice = 0;

    for (const cartItem of cart.items) {
      const product = cartItem.product;

      if (!product) {
        throw new AppError(
          `Product ${cartItem.product} not found or has been removed`,
          404
        );
      }

      const quantity = Number(cartItem.quantity) || 0;
      const unitPrice = Number(product.finalPrice || 0);

      if (product.stock != null && product.stock < quantity) {
        outOfStock.push({
          productId: String(product._id),
          name: product.name,
          available: product.stock,
          requested: quantity,
        });
        continue;
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images?.[0] || product.image || "default-product.jpg",
        price: unitPrice,
        priceSnapshot: unitPrice,
        quantity,
      });

      itemsPrice += unitPrice * quantity;

      stockUpdates.push({
        productId: product._id,
        quantity,
      });
    }

    if (outOfStock.length > 0) {
      throw new AppError("Some items are out of stock", 400, { outOfStock });
    }

    if (!orderItems.length) {
      throw new AppError("No valid items to order", 400);
    }

    // 3. Coupon validation at checkout
    let discountAmount = 0;
    let couponApplied = null;
    let usedCouponDoc = null;

    if (cart.coupon) {
      const couponDoc = cart.coupon; // populated
      const result = await validateCouponAtCheckout({
        couponDoc,
        userId: req.user._id,
        itemsPrice,
        orderItems,
        session,
      });

      discountAmount = result.discountAmount;
      couponApplied = result.couponApplied;
      usedCouponDoc = couponDoc;
    }

    // 4. Calculate final prices
    const prices = calculateOrderPrices(itemsPrice, discountAmount);

    // 5. Decrement stock atomically
    const bulkOps = stockUpdates.map(({ productId, quantity }) => ({
      updateOne: {
        filter: {
          _id: productId,
          stock: { $gte: quantity },
        },
        update: { $inc: { stock: -quantity } },
      },
    }));

    if (bulkOps.length > 0) {
      const bulkResult = await Product.bulkWrite(bulkOps, { session });

      if (bulkResult.modifiedCount !== bulkOps.length) {
        throw new AppError(
          "Stock not available for some items. Please refresh and try again.",
          409
        );
      }
    }

    // 6. If coupon used, atomically bump global usage
    if (usedCouponDoc) {
      const couponUpdate = await Coupon.findOneAndUpdate(
        {
          _id: usedCouponDoc._id,
          $or: [
            { usageLimit: null },
            { usageLimit: { $gt: usedCouponDoc.timesUsed || 0 } },
          ],
        },
        { $inc: { timesUsed: 1 } },
        { session, new: true }
      );

      if (!couponUpdate) {
        throw new AppError("Coupon usage limit exceeded. Please try without coupon.", 400);
      }
    }

    // 7. Create order
    const orderData = {
      user: req.user._id,
      orderItems,
      shippingAddress,
      paymentMethod,
      ...prices,
      couponApplied,
      idempotencyKey: idempotencyKey || generateIdempotencyKey(req.user._id, cart._id),
    };

    const { order } = await Order.createWithIdempotency(orderData, session);

    order.validateTotals();

    // 8. Clear cart
    cart.items = [];
    cart.coupon = null;
    await cart.save({ session });

    // 9. Commit transaction
    await session.commitTransaction();
    session.endSession();

    logger.info("Order created successfully", {
      userId: req.user._id,
      orderId: order._id,
      totalPrice: order.totalPrice,
      itemCount: order.orderItems.length,
    });

    // 10. Send confirmation email asynchronously
    setImmediate(async () => {
      try {
        const email = new Email(
          req.user,
          `${process.env.FRONTEND_URL}/orders/${order._id}`
        );
        await email.sendOrderConfirmation(order);
      } catch (err) {
        logger.error("Order confirmation email failed", {
          orderId: order._id,
          error: err.message,
        });
      }
    });

    res.status(201).json({
      success: true,
      data: order,
      message: "Order created successfully",
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    logger.error("Order creation failed", {
      userId: req.user._id,
      error: err.message,
    });
    throw err;
  }
});

/**
 * GET /api/orders/:id
 * Get order by ID (user must own it or be admin)
 */
export const getOrderById = asyncHandler(async (req, res) => {
  const orderId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new AppError("Invalid order ID", 400);
  }

  const order = await Order.findById(orderId)
    .populate("user", "name email")
    .populate("orderItems.product", "name");

  validateOrderOwnership(order, req.user._id, req.user.role);

  res.status(200).json({
    success: true,
    data: order,
  });
});

/**
 * GET /api/orders
 * Get logged-in user's orders
 */
export const getMyOrders = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  const orders = await Order.getUserOrders(req.user._id, { page, limit });

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders,
  });
});

/**
 * GET /api/orders/:id/payment-status
 * Returns simple payment status for polling
 */
export const getPaymentStatus = asyncHandler(async (req, res) => {
  const orderId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new AppError("Invalid order ID", 400);
  }

  const order = await Order.findById(orderId);

  validateOrderOwnership(order, req.user._id, req.user.role);

  res.status(200).json({
    success: true,
    data: {
      isPaid: order.isPaid,
      status: order.status,
      paidAt: order.paidAt,
    },
  });
});

/**
 * PUT /api/orders/:id/cancel
 * Allows user to cancel order if not yet shipped/paid (simplified rule)
 */
export const cancelOrder = asyncHandler(async (req, res) => {
  const orderId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new AppError("Invalid order ID", 400);
  }

  const order = await Order.findById(orderId);
  validateOrderOwnership(order, req.user._id, req.user.role);

  if (order.isPaid) {
    throw new AppError("Cannot cancel a paid order", 400);
  }

  if (order.status !== "pending") {
    throw new AppError("Only pending orders can be cancelled", 400);
  }

  order.status = "cancelled";
  await order.save();

  res.status(200).json({
    success: true,
    message: "Order cancelled",
    data: order,
  });
});

/**
 * POST /api/orders/:id/return
 * Request return within return window
 */
export const requestReturn = asyncHandler(async (req, res) => {
  const orderId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new AppError("Invalid order ID", 400);
  }

  const order = await Order.findById(orderId);
  validateOrderOwnership(order, req.user._id, req.user.role);

  if (!order.isDelivered) {
    throw new AppError("Cannot request return for undelivered order", 400);
  }

  const deliveredAt = order.deliveredAt || order.updatedAt || order.createdAt;
  const now = new Date();
  const diffDays = (now - deliveredAt) / (1000 * 60 * 60 * 24);

  if (diffDays > ORDER_CONSTANTS.RETURN_WINDOW_DAYS) {
    throw new AppError("Return window has expired", 400);
  }

  if (order.returnStatus !== "none") {
    throw new AppError("Return has already been requested for this order", 400);
  }

  order.returnStatus = "requested";
  order.returnRequestedAt = now;
  await order.save();

  res.status(200).json({
    success: true,
    message: "Return requested",
    data: order,
  });
});
