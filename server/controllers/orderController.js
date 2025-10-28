// File: server/controllers/orderController.js
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Cart from "../models/Cart.js";
import AppError from "../utils/appError.js";
import asyncHandler from "express-async-handler";
import { logger } from "../middleware/logger.js";
import Email from "../utils/email.js";

/**
 * @desc    Create new order from the cart
 * @route   POST /api/orders
 * @access  Private
 */
export const createOrder = asyncHandler(async (req, res, next) => {
  logger.info("Create order start", { userId: req.user._id });
  const {
    shippingAddress,
    paymentMethod = "stripe", // Default to stripe
    coupon,
  } = req.body;

  // 1. Retrieve and validate cart
  const cart = await Cart.findOne({ user: req.user._id }).populate({
    path: 'items.product',
    select: 'name images finalPrice stock'
  });

  if (!cart || cart.items.length === 0) {
    return next(new AppError("No items in the cart", 400));
  }

  // 2. Calculate prices
  const itemsPrice = cart.items.reduce(
    (sum, item) => sum + (item.product.finalPrice * item.quantity),
    0
  );
  const shippingPrice = itemsPrice > 100 ? 0 : 10; // Example shipping calculation
  const taxPrice = Number((itemsPrice * 0.1).toFixed(2)); // Example 10% tax
  const totalPrice = Number((itemsPrice + shippingPrice + taxPrice).toFixed(2));

  // 3. Verify products and stock
  const outOfStockItems = [];
  const productsToUpdate = [];

  for (const item of cart.items) {
    const product = item.product;
    
    if (!product) {
      return next(new AppError(`Product ${item.product._id} not found`, 404));
    }

    if (product.stock < item.quantity) {
      outOfStockItems.push({
        product: product._id,
        name: product.name,
        available: product.stock,
        requested: item.quantity
      });
    } else {
      productsToUpdate.push({
        productId: product._id,
        quantity: item.quantity
      });
    }
  }

  if (outOfStockItems.length > 0) {
    return next(new AppError({
      message: "Some items are out of stock",
      outOfStockItems
    }, 400));
  }

  // 4. Create order items (ensure image is properly set)
  const orderItems = cart.items.map(item => ({
    product: item.product._id,
    name: item.product.name,
    image: item.product.images?.[0] || 'default-product-image.jpg',
    price: item.product.finalPrice,
    quantity: item.quantity
  }));

  // 5. Create order with all required fields
  const order = await Order.create({
    user: req.user._id,
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
    coupon: coupon || undefined,
  });

  // 6. Update product stock
  const bulkOps = productsToUpdate.map(({ productId, quantity }) => ({
    updateOne: {
      filter: { _id: productId },
      update: { $inc: { stock: -quantity } }
    }
  }));

  await Product.bulkWrite(bulkOps);

  // 7. Clear cart
  await Cart.findOneAndUpdate(
    { _id: cart._id },
    { $set: { items: [] } }
  );

  // Send order confirmation email
  try {
    const email = new Email(req.user, `${process.env.FRONTEND_URL}/orders/${order._id}`);
    await email.sendOrderConfirmation(order);
  } catch (error) {
    logger.error("Order confirmation email failed", { 
      orderId: order._id, 
      error: error.message 
    });
    // Don't throw error, as order is already created
  }

  res.status(201).json({
    success: true,
    data: order,
    message: "Order created successfully"
  });
  logger.info("Order created", { orderId: order._id, userId: req.user._id });
});

/**
 * @desc    Get order by ID
 * @route   GET /api/orders/:id
 * @access  Private
 */
export const getOrderById = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate(
    "user",
    "name email"
  );

  if (!order) {
    logger.warn("Order not found", { id: req.params.id });
    return next(new AppError("Order not found", 404));
  }

  // Check if user is owner or admin
  if (order.user._id.toString() !== req.user.id && req.user.role !== "admin") {
    return next(new AppError("Not authorized to view this order", 401));
  }

  res.json({
    success: true,
    data: order,
  });
  logger.info("Fetched order", { id: req.params.id, userId: req.user._id });
});

/**
 * @desc    Get payment status
 * @route   GET /api/orders/:id/payment-status
 * @access  Private
 */
export const getPaymentStatus = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  
  if (!order) {
    logger.warn("Order not found for payment status", { id: req.params.id });
    return next(new AppError('Order not found', 404));
  }

  if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('Not authorized', 401));
  }

  res.status(200).json({
    success: true,
    isPaid: order.isPaid,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentResult?.status
  });
  logger.info("Fetched payment status", { id: req.params.id, isPaid: order.isPaid });
});


/**
 * @desc    Cancel order
 * @route   PUT /api/orders/:id/cancel
 * @access  Private
 */
export const cancelOrder = asyncHandler(async (req, res, next) => {
  logger.info("Cancel order start", { id: req.params.id, userId: req.user._id });
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  // Check if user is owner or admin
  if (order.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(new AppError("Not authorized to cancel this order", 401));
  }

  try {
    await order.cancelOrder();
    
    // Send cancellation email
    const email = new Email(req.user, `${process.env.FRONTEND_URL}/orders/${order._id}`);
    await email.send("orderCancellation", "Your GameShop Order has been cancelled", {
      order,
      cancellationDate: new Date(),
    });

    res.json({
      success: true,
      message: "Order cancelled successfully",
    });
    logger.info("Order cancelled", { id: req.params.id, userId: req.user._id });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

/**
 * @desc    Request order return
 * @route   POST /api/orders/:id/return
 * @access  Private
 */
export const requestReturn = asyncHandler(async (req, res, next) => {
  logger.info("Request return start", { id: req.params.id, userId: req.user._id });
  const { reason } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  // Check if user is owner
  if (order.user.toString() !== req.user.id) {
    return next(new AppError("Not authorized to request return for this order", 401));
  }

  if (!order.isDelivered) {
    return next(new AppError("Order must be delivered before return", 400));
  }

  if (order.status === 'refunded') {
    return next(new AppError("Order already refunded", 400));
  }

  // Must request return within 30 days of delivery
  const returnWindow = new Date(order.deliveredAt);
  returnWindow.setDate(returnWindow.getDate() + 30);

  if (Date.now() > returnWindow) {
    return next(new AppError("Return window has expired", 400));
  }

  order.status = "return_requested";
  order.returnRequest = {
    requestedAt: new Date(),
    reason,
    status: "pending",
  };

  await order.save();

  // Send return request confirmation email
  try {
    const email = new Email(req.user, `${process.env.FRONTEND_URL}/orders/${order._id}`);
    await email.send("returnRequest", "Your Return Request has been received", {
      order,
      returnRequest: order.returnRequest,
    });
  } catch (error) {
    logger.error("Return request email failed", { 
      orderId: order._id, 
      error: error.message 
    });
  }

  res.json({
    success: true,
    message: "Return request submitted",
  });
  logger.info("Return requested", { id: req.params.id, userId: req.user._id });
});

/**
 * @desc    Get logged in user orders
 * @route   GET /api/orders/myorders
 * @access  Private
 */
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort("-createdAt");
  res.json({
    success: true,
    count: orders.length,
    data: orders,
  });
  logger.info("Fetched my orders", { userId: req.user._id, count: orders.length });
});