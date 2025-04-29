// File: server/controllers/orderController.js
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import AppError from "../utils/appError.js";
import asyncHandler from "express-async-handler";

/**
 * @desc    Create new order
 * @route   POST /api/orders
 * @access  Private
 */
export const createOrder = asyncHandler(async (req, res, next) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
    coupon,
  } = req.body;

  if (!orderItems || orderItems.length === 0) {
    return next(new AppError("No order items", 400));
  }

  // Verify all products exist and are in stock
  const products = await Product.find({
    _id: { $in: orderItems.map((item) => item.product) },
  });

  if (products.length !== orderItems.length) {
    return next(new AppError("One or more products not found", 404));
  }

  for (const item of orderItems) {
    const product = products.find((p) => p._id.toString() === item.product);
    if (product.stock < item.quantity) {
      return next(
        new AppError(
          `Not enough stock for ${product.name}. Only ${product.stock} available`,
          400
        )
      );
    }
  }

  // Create order items with product details
  const orderItemsWithDetails = orderItems.map((item) => {
    const product = products.find((p) => p._id.toString() === item.product);
    return {
      product: product._id,
      name: product.name,
      image: product.image,
      price: product.finalPrice,
      quantity: item.quantity,
    };
  });

  const order = new Order({
    user: req.user._id,
    orderItems: orderItemsWithDetails,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
    coupon: coupon || undefined,
  });

  const createdOrder = await order.save();

  // Reduce product stock
  for (const item of orderItems) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: -item.quantity },
    });
  }

  res.status(201).json({
    success: true,
    data: createdOrder,
  });
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
});

/**
 * @desc    Update order to paid
 * @route   PUT /api/orders/:id/pay
 * @access  Private
 */
export const updateOrderToPaid = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  // Check if user is owner or admin
  if (order.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(new AppError("Not authorized to update this order", 401));
  }

  order.isPaid = true;
  order.paidAt = Date.now();
  order.paymentResult = {
    id: req.body.id,
    status: req.body.status,
    update_time: req.body.update_time,
    email_address: req.body.payer.email_address,
  };

  const updatedOrder = await order.save();

  res.json({
    success: true,
    data: updatedOrder,
  });
});

/**
 * @desc    Update order to delivered
 * @route   PUT /api/orders/:id/deliver
 * @access  Private/Admin
 */
export const updateOrderToDelivered = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  if (!order.isPaid) {
    return next(new AppError("Order must be paid before delivery", 400));
  }

  order.isDelivered = true;
  order.deliveredAt = Date.now();

  const updatedOrder = await order.save();

  res.json({
    success: true,
    data: updatedOrder,
  });
});

/**
 * @desc    Cancel order
 * @route   PUT /api/orders/:id/cancel
 * @access  Private
 */
export const cancelOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  // Check if user is owner or admin
  if (order.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(new AppError("Not authorized to cancel this order", 401));
  }

  if (order.isDelivered) {
    return next(new AppError("Delivered orders cannot be cancelled", 400));
  }

  if (order.isPaid) {
    // TODO: Initiate refund process
  }

  order.status = "cancelled";
  await order.save();

  // Restore product stock
  for (const item of order.orderItems) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity },
    });
  }

  res.json({
    success: true,
    message: "Order cancelled successfully",
  });
});

/**
 * @desc    Request order return
 * @route   POST /api/orders/:id/return
 * @access  Private
 */
export const requestReturn = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  // Check if user is owner
  if (order.user.toString() !== req.user.id) {
    return next(
      new AppError("Not authorized to request return for this order", 401)
    );
  }

  if (!order.isDelivered) {
    return next(new AppError("Order must be delivered before return", 400));
  }

  if (order.returnRequest) {
    return next(new AppError("Return already requested for this order", 400));
  }

  // Must request return within 30 days of delivery
  const returnWindow = new Date(order.deliveredAt);
  returnWindow.setDate(returnWindow.getDate() + 30);

  if (Date.now() > returnWindow) {
    return next(new AppError("Return window has expired", 400));
  }

  order.returnRequest = {
    requestedAt: new Date(),
    reason,
    status: "Pending",
  };
  await order.save();

  res.json({
    success: true,
    message: "Return request submitted",
  });
});

/**
 * @desc    Process order return (Admin only)
 * @route   PUT /api/orders/:id/process-return
 * @access  Private/Admin
 */
export const processReturn = asyncHandler(async (req, res, next) => {
  const { action } = req.body; // 'approve' or 'reject'
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  if (!order.returnRequest) {
    return next(new AppError("No return request for this order", 400));
  }

  if (order.returnRequest.status !== "Pending") {
    return next(new AppError("Return request already processed", 400));
  }

  if (action === "approve") {
    order.returnRequest.status = "Approved";
    order.returnRequest.processedAt = new Date();
    order.status = "Returned";

    // TODO: Initiate refund process if paid
  } else if (action === "reject") {
    order.returnRequest.status = "Rejected";
    order.returnRequest.processedAt = new Date();
    order.returnRequest.rejectionReason =
      req.body.rejectionReason || "Not specified";
  } else {
    return next(new AppError("Invalid action", 400));
  }

  await order.save();

  res.json({
    success: true,
    message: `Return request ${action}d`,
  });
});

/**
 * @desc    Get logged in user orders
 * @route   GET /api/orders/myorders
 * @access  Private
 */
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id });
  res.json({
    success: true,
    count: orders.length,
    data: orders,
  });
});

/**
 * @desc    Get all orders (Admin only)
 * @route   GET /api/orders
 * @access  Private/Admin
 */
export const getOrders = asyncHandler(async (req, res) => {
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
});
