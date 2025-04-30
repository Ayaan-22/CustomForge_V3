// File: server/routes/paymentRoutes.js
import express from 'express';
import {
  processPayment,
  createPaymentIntent,
  handleWebhook,
  savePaymentMethod,
  getPaymentMethods
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Webhook for Stripe (No authentication needed)
router.route('/webhook')
  .post(handleWebhook);

// Authenticated Payment Operations
router.use(protect);

// Unified payment processing endpoint
router.route('/process')
  .post(processPayment);

// Stripe-specific operations
router.route('/create-intent')
  .post(createPaymentIntent);

// Payment methods management
router.route('/payment-methods')
  .get(getPaymentMethods) // List saved methods
  .post(savePaymentMethod); // Save new method

export default router;