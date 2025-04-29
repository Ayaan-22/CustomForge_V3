// server/controllers/paymentController.js

import Order from "../models/Order.js";
import User from "../models/User.js";
import asyncHandler from "express-async-handler";
import Stripe from "stripe";
import AppError from "../utils/appError.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * @desc    Create Stripe Payment Intent
 * @route   POST /api/payment/create-payment-intent
 * @access  Private
 */
export const createPaymentIntent = asyncHandler(async (req, res, next) => {
  const { orderId } = req.body;

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
    amount: Math.round(order.totalPrice * 100), // Amount in cents
    currency: "usd",
    customer: customerId,
    metadata: {
      orderId: order._id.toString(),
      userId: req.user._id.toString(),
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
  });
});

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

/**
 * @desc    Stripe Webhook Handler
 * @route   POST /api/payment/webhook
 * @access  Public
 */
export const handleWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`⚠️  Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case "payment_intent.succeeded":
      const paymentIntent = event.data.object;

      const order = await Order.findById(paymentIntent.metadata.orderId);

      if (!order) {
        console.error(`Order ${paymentIntent.metadata.orderId} not found`);
        return res.status(400).send("Order not found");
      }

      // Extra safety check
      const paidAmount = paymentIntent.amount_received / 100; // Convert cents to dollars

      if (Math.abs(paidAmount - order.totalPrice) > 0.01) {
        console.error(
          `Paid amount ${paidAmount} does not match order total ${order.totalPrice}`
        );
        return res.status(400).send("Amount mismatch");
      }

      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentMethod = "card";
      order.paymentResult = {
        id: paymentIntent.id,
        status: paymentIntent.status,
        email: paymentIntent.receipt_email || "",
      };

      await order.save();
      break;

    case "payment_intent.payment_failed":
      console.error("Payment failed:", event.data.object);
      break;

    case "charge.refunded":
      const refundedCharge = event.data.object;
      const refundedOrder = await Order.findById(
        refundedCharge.metadata.orderId
      );

      if (refundedOrder) {
        refundedOrder.status = "refunded";
        refundedOrder.refundedAt = new Date();
        await refundedOrder.save();
      }
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});
