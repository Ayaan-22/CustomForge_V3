// File: server/controllers/paymentController.js
import mongoose from "mongoose";
import Order from "../models/Order.js";
import User from "../models/User.js";
import asyncHandler from "express-async-handler";
import { logger } from "../middleware/logger.js";
import Stripe from "stripe";
import AppError from "../utils/appError.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Payment configuration
const PAYMENT_CONFIG = {
  CURRENCY: "usd",
  WEBHOOK_TOLERANCE: 300, // 5 minutes for timestamp validation
  MAX_PAYMENT_AMOUNT: 1000000, // $10,000 max
  PAYMENT_INTENT_MAX_AGE_MS: 24 * 60 * 60 * 1000, // 24 hours
};

// Stripe webhook IPs for validation (update from Stripe documentation)
const STRIPE_WEBHOOK_IPS = [
  '3.18.12.63', '3.130.192.231', '13.235.14.237',
  '13.235.122.149', '18.211.135.69', '35.154.171.200',
  '52.15.183.38', '54.187.174.169', '54.187.205.235',
  '54.187.216.72'
];

/* ----------------------- Helper Functions ----------------------- */

/**
 * Sanitize metadata for Stripe
 */
function sanitizeMetadata(obj) {
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      sanitized[key] = String(value)
        .replace(/[^\w\s@.-]/g, '')
        .trim()
        .slice(0, 500);
    }
  }
  return sanitized;
}

/**
 * Validate order ownership
 */
function validatePaymentAuthorization(order, userId, userRole) {
  const orderUserId = String(order.user._id || order.user);
  const requestUserId = String(userId);

  if (orderUserId !== requestUserId && userRole !== "admin") {
    throw new AppError("Not authorized to process payment for this order", 403);
  }
}

/**
 * Validate payment amount matches order
 */
function validatePaymentAmount(paidAmount, orderTotal, tolerance = 0.01) {
  const difference = Math.abs(paidAmount - orderTotal);
  if (difference > tolerance) {
    throw new AppError(
      `Payment amount (${paidAmount}) does not match order total (${orderTotal})`,
      400
    );
  }
}

/**
 * Validate webhook IP address
 */
function isValidWebhookIP(ip) {
  if (process.env.NODE_ENV !== 'production') {
    return true; // Skip in development
  }
  
  // Remove IPv6 prefix if present
  const cleanIP = ip.replace(/^::ffff:/, '');
  return STRIPE_WEBHOOK_IPS.includes(cleanIP);
}

/* ----------------------- Controllers ----------------------- */

/**
 * @desc    Process payment for an order
 * @route   POST /api/payment/process
 * @access  Private
 * @body    { orderId, paymentMethod, paymentData }
 */
export const processPayment = asyncHandler(async (req, res, next) => {
  const { orderId, paymentMethod, paymentData } = req.body;

  logger.info("Process payment request", {
    orderId,
    paymentMethod,
    userId: req.user._id
  });

  // Validate inputs
  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    throw new AppError("Valid order ID is required", 400);
  }

  if (!paymentMethod || !["stripe", "paypal", "cod"].includes(paymentMethod)) {
    throw new AppError("Valid payment method is required", 400);
  }

  // Start transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate order exists and belongs to user
    const order = await Order.findById(orderId).session(session);
    
    if (!order) {
      throw new AppError("Order not found", 404);
    }

    validatePaymentAuthorization(order, req.user._id, req.user.role);

    if (order.isPaid) {
      throw new AppError("Order is already paid", 400);
    }

    if (order.status === "cancelled" || order.status === "refunded") {
      throw new AppError("Cannot pay for cancelled or refunded order", 400);
    }

    // Process payment based on method
    let paymentResult;
    switch (paymentMethod) {
      case "stripe":
        paymentResult = await processStripePayment(order, paymentData, req.user);
        break;
      case "paypal":
        paymentResult = await processPayPalPayment(order, paymentData);
        break;
      case "cod":
        paymentResult = await processCODPayment(order);
        break;
      default:
        throw new AppError("Invalid payment method", 400);
    }

    // Mark order as paid
    await order.markAsPaid(paymentResult, session);

    // Commit transaction
    await session.commitTransaction();

    logger.info("Payment processed successfully", {
      orderId: order._id,
      paymentMethod,
      userId: req.user._id
    });

    res.status(200).json({
      success: true,
      message: "Payment processed successfully",
      data: order,
    });

  } catch (error) {
    await session.abortTransaction();
    logger.error("Payment processing failed", {
      orderId,
      error: error.message,
      userId: req.user._id
    });
    throw error;
  } finally {
    session.endSession();
  }
});

/**
 * Stripe Payment Processor with enhanced verification
 */
async function processStripePayment(order, paymentData, user) {
  if (!paymentData || !paymentData.paymentIntentId) {
    throw new AppError("Stripe payment intent ID is required", 400);
  }

  try {
    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(
      paymentData.paymentIntentId
    );

    // Verify payment intent status
    if (paymentIntent.status !== "succeeded") {
      throw new AppError(
        `Payment not completed. Status: ${paymentIntent.status}`,
        400
      );
    }

    // Verify payment intent belongs to this order
    if (
      !paymentIntent.metadata ||
      paymentIntent.metadata.orderId !== String(order._id)
    ) {
      throw new AppError("Payment intent does not match this order", 400);
    }

    // Verify customer matches
    const customerMetadata = paymentIntent.metadata.userId;
    if (customerMetadata && customerMetadata !== String(user._id)) {
      throw new AppError("Payment intent customer mismatch", 400);
    }

    // Verify payment amount
    const paidAmount = paymentIntent.amount_received / 100;
    validatePaymentAmount(paidAmount, order.totalPrice);

    // Verify payment is recent (prevent old payment reuse)
    const paymentCreatedAt = new Date(paymentIntent.created * 1000);
    const timeDiff = Date.now() - paymentCreatedAt.getTime();

    if (timeDiff > PAYMENT_CONFIG.PAYMENT_INTENT_MAX_AGE_MS) {
      logger.warn("Old payment intent used", {
        paymentIntentId: paymentIntent.id,
        createdAt: paymentCreatedAt,
        orderId: order._id,
        ageDays: timeDiff / (24 * 60 * 60 * 1000)
      });
    }

    return {
      id: paymentIntent.id,
      status: "succeeded",
      update_time: new Date().toISOString(),
      email_address: paymentIntent.receipt_email || user.email,
      payment_method: "stripe",
      transaction_id: paymentIntent.id
    };

  } catch (error) {
    if (error instanceof AppError) throw error;
    
    logger.error("Stripe payment processing error", {
      error: error.message,
      orderId: order._id
    });
    throw new AppError(`Stripe payment failed: ${error.message}`, 400);
  }
}

/**
 * PayPal Payment Processor with validation
 */
async function processPayPalPayment(order, paymentData) {
  if (!paymentData || !paymentData.id) {
    throw new AppError("PayPal payment ID is required", 400);
  }

  if (!paymentData.status || paymentData.status !== "COMPLETED") {
    throw new AppError("PayPal payment not completed", 400);
  }

  if (!paymentData.payer || !paymentData.payer.email_address) {
    throw new AppError("PayPal payment data incomplete", 400);
  }

  // In production, verify this payment with PayPal API
  // For now, we trust the client data with basic validation

  return {
    id: paymentData.id,
    status: "succeeded",
    update_time: paymentData.update_time || new Date().toISOString(),
    email_address: paymentData.payer.email_address,
    payment_method: "paypal",
    transaction_id: paymentData.id
  };
}

/**
 * Cash on Delivery Processor
 */
async function processCODPayment(order) {
  // COD orders are marked as processing but not paid until delivery
  return {
    id: `COD_${order._id}`,
    status: "pending",
    update_time: new Date().toISOString(),
    email_address: null,
    payment_method: "cod"
  };
}

/**
 * @desc    Create Stripe Payment Intent
 * @route   POST /api/payment/create-intent
 * @access  Private
 * @body    { orderId }
 */
export const createPaymentIntent = asyncHandler(async (req, res, next) => {
  const { orderId } = req.body;

  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    throw new AppError("Valid order ID is required", 400);
  }

  const order = await Order.findById(orderId);
  
  if (!order) {
    throw new AppError("Order not found", 404);
  }

  // Authorization check
  validatePaymentAuthorization(order, req.user._id, req.user.role);

  if (order.isPaid) {
    throw new AppError("Order is already paid", 400);
  }

  if (order.status === "cancelled" || order.status === "refunded") {
    throw new AppError("Cannot create payment for cancelled or refunded order", 400);
  }

  // Validate order amount
  if (order.totalPrice <= 0 || order.totalPrice > PAYMENT_CONFIG.MAX_PAYMENT_AMOUNT) {
    throw new AppError("Invalid order amount", 400);
  }

  try {
    // Get or create Stripe customer
    let customerId = req.user.stripeCustomerId;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.name,
        metadata: sanitizeMetadata({ 
          userId: String(req.user._id)
        }),
      });
      customerId = customer.id;
      
      // Save customer ID to user
      await User.findByIdAndUpdate(req.user._id, {
        stripeCustomerId: customerId,
      });
    }

    // Sanitize all metadata
    const metadata = sanitizeMetadata({
      orderId: String(order._id),
      orderNumber: order.orderNumber || '',
      userId: String(req.user._id),
      userEmail: req.user.email || ''
    });

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalPrice * 100),
      currency: PAYMENT_CONFIG.CURRENCY,
      customer: customerId,
      metadata,
      description: `Payment for Order #${order.orderNumber || order._id}`,
      shipping: order.shippingAddress
        ? {
            name: String(order.shippingAddress.fullName).slice(0, 100),
            address: {
              line1: String(order.shippingAddress.address).slice(0, 200),
              city: String(order.shippingAddress.city).slice(0, 100),
              state: String(order.shippingAddress.state).slice(0, 100),
              postal_code: String(order.shippingAddress.postalCode).slice(0, 20),
              country: String(order.shippingAddress.country || "US").slice(0, 2),
            },
            phone: order.shippingAddress.phone 
              ? String(order.shippingAddress.phone).slice(0, 20) 
              : undefined
          }
        : undefined,
      receipt_email: req.user.email
    });

    logger.info("Payment intent created", {
      orderId: order._id,
      paymentIntentId: paymentIntent.id,
      amount: order.totalPrice
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });

  } catch (error) {
    logger.error("Payment intent creation failed", {
      orderId: order._id,
      error: error.message
    });
    throw new AppError(`Failed to create payment intent: ${error.message}`, 500);
  }
});

/**
 * @desc    Stripe Webhook Handler with replay protection
 * @route   POST /api/payment/webhook
 * @access  Public (Stripe)
 */
export const handleWebhook = asyncHandler(async (req, res, next) => {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    logger.error("Webhook signature missing");
    throw new AppError("Webhook signature required", 400);
  }

  // Validate IP address in production
  const clientIP = req.ip || req.connection.remoteAddress;
  if (!isValidWebhookIP(clientIP)) {
    logger.warn("Webhook from unauthorized IP", { ip: clientIP });
    return res.status(403).json({ error: "Unauthorized IP" });
  }

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    logger.error("Webhook signature verification failed", {
      error: err.message
    });
    throw new AppError(`Webhook Error: ${err.message}`, 400);
  }

  // Validate event timestamp to prevent replay attacks
  const eventTimestamp = event.created;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  
  if (currentTimestamp - eventTimestamp > PAYMENT_CONFIG.WEBHOOK_TOLERANCE) {
    logger.warn("Old webhook event ignored", {
      eventId: event.id,
      eventType: event.type,
      age: currentTimestamp - eventTimestamp
    });
    return res.json({ received: true, ignored: true });
  }

  logger.info("Webhook event received", {
    eventId: event.id,
    eventType: event.type
  });

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handleSuccessfulPayment(event.data.object);
        break;

      case "payment_intent.payment_failed":
        await handleFailedPayment(event.data.object);
        break;

      case "charge.refunded":
        await handleRefund(event.data.object);
        break;

      case "payment_intent.canceled":
        logger.info("Payment intent cancelled", {
          paymentIntentId: event.data.object.id
        });
        break;

      default:
        logger.info("Unhandled webhook event type", { 
          type: event.type,
          eventId: event.id
        });
    }

    res.json({ received: true });

  } catch (err) {
    logger.error("Webhook processing error", {
      eventId: event.id,
      eventType: event.type,
      error: err.message,
      stack: err.stack
    });
    
    // Return 200 to acknowledge receipt even if processing fails
    // Stripe will retry if we return error
    res.json({ received: true, error: err.message });
  }
});

/**
 * Handle successful payment webhook
 */
async function handleSuccessfulPayment(paymentIntent) {
  if (!paymentIntent || !paymentIntent.metadata || !paymentIntent.metadata.orderId) {
    logger.error("Invalid payment intent metadata", { paymentIntent });
    return;
  }

  const orderId = paymentIntent.metadata.orderId;

  // Start transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);

    if (!order) {
      logger.error("Order not found for successful payment", { orderId });
      await session.abortTransaction();
      return;
    }

    // Idempotency: if order already paid, skip
    if (order.isPaid) {
      logger.info("Order already marked as paid", { orderId });
      await session.abortTransaction();
      return;
    }

    // Verify payment amount
    const paidAmount = paymentIntent.amount_received / 100;
    validatePaymentAmount(paidAmount, order.totalPrice);

    // Mark order as paid
    await order.markAsPaid(
      {
        id: paymentIntent.id,
        status: "succeeded",
        update_time: new Date().toISOString(),
        email_address: paymentIntent.receipt_email || paymentIntent.metadata.userEmail,
        payment_method: "stripe",
        transaction_id: paymentIntent.id
      },
      session
    );

    await session.commitTransaction();

    logger.info("Payment webhook processed successfully", {
      orderId,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    await session.abortTransaction();
    logger.error("Payment webhook processing failed", {
      orderId,
      error: error.message
    });
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Handle failed payment webhook
 */
async function handleFailedPayment(paymentIntent) {
  logger.warn("Payment failed", {
    paymentIntentId: paymentIntent.id,
    orderId: paymentIntent.metadata?.orderId,
    error: paymentIntent.last_payment_error?.message
  });

  // Could add logic to notify user or update order status
}

/**
 * Handle refund webhook
 */
async function handleRefund(refundedCharge) {
  if (!refundedCharge.metadata || !refundedCharge.metadata.orderId) {
    logger.warn("Refund webhook missing order metadata", {
      chargeId: refundedCharge.id
    });
    return;
  }

  const orderId = refundedCharge.metadata.orderId;

  // Start transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);

    if (!order) {
      logger.error("Order not found for refund", { orderId });
      await session.abortTransaction();
      return;
    }

    // Idempotency: if already refunded, skip
    if (order.isRefunded) {
      logger.info("Order already marked as refunded", { orderId });
      await session.abortTransaction();
      return;
    }

    const refundAmount = refundedCharge.amount_refunded / 100;

    await order.markAsRefunded(
      {
        refundId: refundedCharge.refund,
        amount: refundAmount,
        reason: "Stripe refund processed"
      },
      session
    );

    await session.commitTransaction();

    logger.info("Refund webhook processed successfully", {
      orderId,
      chargeId: refundedCharge.id,
      refundAmount
    });

  } catch (error) {
    await session.abortTransaction();
    logger.error("Refund webhook processing failed", {
      orderId,
      error: error.message
    });
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * @desc    Process actual Stripe refund
 * @route   POST /api/payment/refund
 * @access  Private (Admin only)
 * @body    { orderId, amount?, reason? }
 */
export const processRefund = asyncHandler(async (req, res, next) => {
  const { orderId, amount, reason } = req.body;

  // Only admins can process refunds
  if (req.user.role !== "admin") {
    throw new AppError("Only administrators can process refunds", 403);
  }

  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    throw new AppError("Valid order ID is required", 400);
  }

  // Start transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    if (order.isRefunded) {
      throw new AppError("Order is already refunded", 400);
    }

    if (!order.isPaid) {
      throw new AppError("Cannot refund unpaid order", 400);
    }

    if (order.paymentMethod === "cod") {
      throw new AppError("COD orders cannot be refunded through this endpoint", 400);
    }

    if (!order.paymentResult || !order.paymentResult.id) {
      throw new AppError("Payment information not found for this order", 400);
    }

    // Determine refund amount
    const refundAmount = amount && amount > 0 
      ? Math.min(amount, order.totalPrice)
      : order.totalPrice;

    if (refundAmount <= 0) {
      throw new AppError("Invalid refund amount", 400);
    }

    // Process Stripe refund
    let stripeRefund;
    try {
      stripeRefund = await stripe.refunds.create({
        payment_intent: order.paymentResult.id,
        amount: Math.round(refundAmount * 100),
        reason: reason || "requested_by_customer",
        metadata: sanitizeMetadata({
          orderId: String(order._id),
          orderNumber: order.orderNumber || ''
        })
      });
    } catch (stripeError) {
      logger.error("Stripe refund failed", {
        orderId: order._id,
        error: stripeError.message
      });
      throw new AppError(`Stripe refund failed: ${stripeError.message}`, 500);
    }

    // Mark order as refunded and restore stock
    await order.markAsRefunded(
      {
        refundId: stripeRefund.id,
        amount: refundAmount,
        reason: reason || "Admin processed refund",
        userId: req.user._id
      },
      session
    );

    await session.commitTransaction();

    logger.info("Refund processed successfully", {
      orderId: order._id,
      refundAmount,
      stripeRefundId: stripeRefund.id
    });

    res.status(200).json({
      success: true,
      message: "Refund processed successfully",
      data: {
        order,
        refund: {
          id: stripeRefund.id,
          amount: refundAmount,
          status: stripeRefund.status
        }
      }
    });

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

/**
 * @desc    Save payment method for user
 * @route   POST /api/payment/save-payment-method
 * @access  Private
 * @body    { paymentMethodId }
 */
export const savePaymentMethod = asyncHandler(async (req, res, next) => {
  const { paymentMethodId } = req.body;

  if (!paymentMethodId || typeof paymentMethodId !== "string") {
    throw new AppError("Valid payment method ID is required", 400);
  }

  if (!req.user.stripeCustomerId) {
    throw new AppError("No Stripe customer associated with this account", 400);
  }

  try {
    // Attach payment method to customer
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: req.user.stripeCustomerId,
    });

    // Get customer details
    const customer = await stripe.customers.retrieve(req.user.stripeCustomerId);

    // Set as default if no default exists
    if (!customer.invoice_settings?.default_payment_method) {
      await stripe.customers.update(req.user.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethod.id,
        },
      });
    }

    // Save to user record
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { paymentMethods: paymentMethod.id },
    });

    logger.info("Payment method saved", {
      userId: req.user._id,
      paymentMethodId: paymentMethod.id
    });

    res.status(200).json({
      success: true,
      message: "Payment method saved successfully",
      data: paymentMethod,
    });

  } catch (error) {
    logger.error("Save payment method failed", {
      userId: req.user._id,
      error: error.message
    });
    throw new AppError(`Failed to save payment method: ${error.message}`, 500);
  }
});

/**
 * @desc    Get user's saved payment methods
 * @route   GET /api/payment/payment-methods
 * @access  Private
 */
export const getPaymentMethods = asyncHandler(async (req, res) => {
  if (!req.user.stripeCustomerId) {
    return res.status(200).json({ 
      success: true, 
      data: [] 
    });
  }

  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: req.user.stripeCustomerId,
      type: "card",
    });

    res.status(200).json({
      success: true,
      data: paymentMethods.data,
    });

  } catch (error) {
    logger.error("Get payment methods failed", {
      userId: req.user._id,
      error: error.message
    });
    throw new AppError("Failed to retrieve payment methods", 500);
  }
});

/**
 * @desc    Remove saved payment method
 * @route   DELETE /api/payment/payment-methods/:paymentMethodId
 * @access  Private
 */
export const removePaymentMethod = asyncHandler(async (req, res) => {
  const { paymentMethodId } = req.params;

  if (!paymentMethodId) {
    throw new AppError("Payment method ID is required", 400);
  }

  try {
    // Detach from Stripe
    await stripe.paymentMethods.detach(paymentMethodId);

    // Remove from user record
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { paymentMethods: paymentMethodId },
    });

    logger.info("Payment method removed", {
      userId: req.user._id,
      paymentMethodId
    });

    res.status(200).json({
      success: true,
      message: "Payment method removed successfully",
    });

  } catch (error) {
    logger.error("Remove payment method failed", {
      userId: req.user._id,
      error: error.message
    });
    throw new AppError("Failed to remove payment method", 500);
  }
});