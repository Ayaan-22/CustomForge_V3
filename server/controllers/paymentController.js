// server/controllers/paymentController.js
import Order from "../models/Order.js";
import User from "../models/User.js";
import asyncHandler from "express-async-handler";
import Stripe from "stripe";
import AppError from "../utils/appError.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * @desc    Process payment for an order
 * @route   POST /api/payment/process
 * @access  Private
 */
export const processPayment = asyncHandler(async (req, res, next) => {
  const { orderId, paymentMethod, paymentData } = req.body;

  // Validate order exists and belongs to user
  const order = await Order.findById(orderId);
  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  if (order.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(new AppError("Not authorized to pay for this order", 403));
  }

  if (order.isPaid) {
    return next(new AppError("Order is already paid", 400));
  }

  // Process payment based on method
  try {
    switch (paymentMethod) {
      case "stripe":
        await processStripePayment(order, paymentData, req.user);
        break;
      case "paypal":
        await processPayPalPayment(order, paymentData);
        break;
      case "cod":
        await processCODPayment(order);
        break;
      default:
        return next(new AppError("Invalid payment method", 400));
    }

    const updatedOrder = await Order.findById(orderId);
    res.status(200).json({
      success: true,
      data: updatedOrder,
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

// Stripe Payment Processor
async function processStripePayment(order, paymentData, user) {
  if (!paymentData.paymentIntentId) {
    throw new Error("Stripe payment intent ID required");
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(
    paymentData.paymentIntentId
  );

  // Verify payment intent matches order
  if (paymentIntent.metadata.orderId !== order._id.toString()) {
    throw new Error("Payment intent does not match order");
  }

  const paidAmount = paymentIntent.amount_received / 100;
  if (Math.abs(paidAmount - order.totalPrice) > 0.01) {
    throw new Error("Payment amount doesn't match order total");
  }

  await order.markAsPaid({
    id: paymentIntent.id,
    status: paymentIntent.status,
    update_time: new Date().toISOString(),
    email_address: paymentIntent.receipt_email || user.email,
    payment_method: "stripe",
  });
}

// PayPal Payment Processor
async function processPayPalPayment(order, paymentData) {
  if (!paymentData.payer || !paymentData.payer.email_address) {
    throw new Error("PayPal payment data incomplete");
  }

  await order.markAsPaid({
    id: paymentData.id,
    status: paymentData.status,
    update_time: paymentData.update_time || new Date().toISOString(),
    email_address: paymentData.payer.email_address,
    payment_method: "paypal",
  });
}

// Cash on Delivery Processor
async function processCODPayment(order) {
  order.paymentMethod = "cod";
  order.status = "processing";
  await order.save();
}

/**
 * @desc    Create Stripe Payment Intent
 * @route   POST /api/payment/create-intent
 * @access  Private
 */
export const createPaymentIntent = asyncHandler(async (req, res, next) => {
  const { orderId } = req.body;

  const order = await Order.findById(orderId);
  if (!order) return next(new AppError("Order not found", 404));

  // Authorization check
  if (order.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(new AppError("Not authorized to pay for this order", 403));
  }

  if (order.isPaid) {
    return next(new AppError("Order is already paid", 400));
  }

  // Create or retrieve Stripe customer
  let customerId = req.user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: req.user.email,
      name: req.user.name,
      metadata: { userId: req.user._id.toString() },
    });
    customerId = customer.id;
    await User.findByIdAndUpdate(req.user._id, {
      stripeCustomerId: customerId,
    });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(order.totalPrice * 100),
    currency: "usd",
    customer: customerId,
    metadata: {
      orderId: order._id.toString(),
      userId: req.user._id.toString(),
      userEmail: req.user.email,
    },
    description: `Payment for Order #${order._id}`,
    shipping: order.shippingAddress
      ? {
          name: order.shippingAddress.fullName,
          address: {
            line1: order.shippingAddress.address,
            city: order.shippingAddress.city,
            postal_code: order.shippingAddress.postalCode,
            country: order.shippingAddress.country,
          },
        }
      : undefined,
  });

  res.status(200).json({
    success: true,
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  });
});

/**
 * @desc    Stripe Webhook Handler
 * @route   POST /api/payment/webhook
 * @access  Public
 */
export const handleWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers["stripe-signature"];

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case "payment_intent.succeeded":
        await handleSuccessfulPayment(event.data.object);
        break;

      case "payment_intent.payment_failed":
        console.error("Payment failed:", event.data.object);
        break;

      case "charge.refunded":
        await handleRefund(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

async function handleSuccessfulPayment(paymentIntent) {
  const order = await Order.findById(paymentIntent.metadata.orderId);
  if (!order) throw new Error("Order not found");

  const paidAmount = paymentIntent.amount_received / 100;
  if (Math.abs(paidAmount - order.totalPrice) > 0.01) {
    throw new Error("Amount mismatch");
  }

  await order.markAsPaid({
    id: paymentIntent.id,
    status: paymentIntent.status,
    update_time: new Date().toISOString(),
    email_address:
      paymentIntent.receipt_email || paymentIntent.metadata.userEmail,
    payment_method: "stripe",
  });
}

async function handleRefund(refundedCharge) {
  const order = await Order.findById(refundedCharge.metadata.orderId);
  if (order) {
    order.status = "refunded";
    order.refundedAt = new Date();
    await order.save();

    // Restore product stock if needed
    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }
  }
}

/**
 * @desc    Save payment method for user
 * @route   POST /api/payment/save-payment-method
 * @access  Private
 */
export const savePaymentMethod = asyncHandler(async (req, res, next) => {
  const { paymentMethodId } = req.body;

  if (!req.user.stripeCustomerId) {
    return next(
      new AppError("No Stripe customer associated with this account", 400)
    );
  }

  const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
    customer: req.user.stripeCustomerId,
  });

  const customer = await stripe.customers.retrieve(req.user.stripeCustomerId);

  if (!customer.invoice_settings.default_payment_method) {
    await stripe.customers.update(req.user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethod.id,
      },
    });
  }

  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { paymentMethods: paymentMethod.id },
  });

  res.status(200).json({
    success: true,
    data: paymentMethod,
  });
});

/**
 * @desc    Get user's saved payment methods
 * @route   GET /api/payment/payment-methods
 * @access  Private
 */
export const getPaymentMethods = asyncHandler(async (req, res) => {
  if (!req.user.stripeCustomerId) {
    return res.status(200).json({ success: true, data: [] });
  }

  const paymentMethods = await stripe.paymentMethods.list({
    customer: req.user.stripeCustomerId,
    type: "card",
  });

  res.status(200).json({
    success: true,
    data: paymentMethods.data,
  });
});
