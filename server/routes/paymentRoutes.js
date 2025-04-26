// File: server/routes/paymentRoutes.js
import express from 'express';
import {
  createPaymentIntent,
  handleWebhook,
  savePaymentMethod,
  getPaymentMethods
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Webhook doesn't need protection (handled by Stripe signature)
router.route('/webhook')
  .post(handleWebhook);

// Protected routes
router.use(protect);

router.route('/create-payment-intent')
  .post(createPaymentIntent);

router.route('/payment-methods')
  .get(getPaymentMethods)
  .post(savePaymentMethod);

export default router;