// File: server/controllers/paymentController.js
import Order from '../models/Order.js';
import User from '../models/User.js';
import asyncHandler from 'express-async-handler';
import Stripe from 'stripe';
import AppError from '../utils/appError.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * @desc    Create payment intent
 * @route   POST /api/payment/create-payment-intent
 * @access  Private
 */
export const createPaymentIntent = asyncHandler(async (req, res, next) => {
  const { orderId } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  // Check if user is owner or admin
  if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('Not authorized to pay for this order', 403));
  }

  // Check if order is already paid
  if (order.isPaid) {
    return next(new AppError('Order is already paid', 400));
  }

  // Create or retrieve Stripe customer
  let customerId;
  if (req.user.stripeCustomerId) {
    customerId = req.user.stripeCustomerId;
  } else {
    const customer = await stripe.customers.create({
      email: req.user.email,
      name: req.user.name,
      metadata: {
        userId: req.user._id.toString()
      }
    });
    customerId = customer.id;
    
    // Save customer ID to user
    await User.findByIdAndUpdate(req.user._id, {
      stripeCustomerId: customer.id
    });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(order.totalPrice * 100), // Convert to cents
    currency: 'usd',
    customer: customerId,
    metadata: { 
      orderId: order._id.toString(),
      userId: req.user._id.toString()
    },
    description: `Payment for order #${order._id}`,
    shipping: order.shippingAddress ? {
      name: order.shippingAddress.fullName,
      address: {
        line1: order.shippingAddress.address,
        city: order.shippingAddress.city,
        postal_code: order.shippingAddress.postalCode,
        country: order.shippingAddress.country
      }
    } : undefined
  });

  res.status(200).json({
    success: true,
    clientSecret: paymentIntent.client_secret
  });
});

/**
 * @desc    Save payment method
 * @route   POST /api/payment/save-payment-method
 * @access  Private
 */
export const savePaymentMethod = asyncHandler(async (req, res, next) => {
  const { paymentMethodId } = req.body;

  if (!req.user.stripeCustomerId) {
    return next(new AppError('No Stripe customer associated with this account', 400));
  }

  // Attach payment method to customer
  const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
    customer: req.user.stripeCustomerId
  });

  // Set as default if no default payment method
  const customer = await stripe.customers.retrieve(req.user.stripeCustomerId);
  if (!customer.invoice_settings.default_payment_method) {
    await stripe.customers.update(req.user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethod.id
      }
    });
  }

  // Save payment method to user
  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { paymentMethods: paymentMethod.id }
  });

  res.status(200).json({
    success: true,
    data: paymentMethod
  });
});

/**
 * @desc    Get saved payment methods
 * @route   GET /api/payment/payment-methods
 * @access  Private
 */
export const getPaymentMethods = asyncHandler(async (req, res, next) => {
  if (!req.user.stripeCustomerId) {
    return res.json({
      success: true,
      data: []
    });
  }

  const paymentMethods = await stripe.paymentMethods.list({
    customer: req.user.stripeCustomerId,
    type: 'card'
  });

  res.status(200).json({
    success: true,
    data: paymentMethods.data
  });
});

/**
 * @desc    Handle Stripe webhook events
 * @route   POST /api/payment/webhook
 * @access  Public
 */
export const handleWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      await Order.findByIdAndUpdate(paymentIntent.metadata.orderId, {
        isPaid: true,
        paidAt: new Date(),
        paymentMethod: 'card',
        paymentResult: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          email: paymentIntent.receipt_email
        }
      });
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log(`Payment failed for order ${failedPayment.metadata.orderId}`);
      break;

    case 'charge.refunded':
      const charge = event.data.object;
      await Order.findByIdAndUpdate(charge.metadata.orderId, {
        status: 'Refunded',
        refundedAt: new Date()
      });
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});