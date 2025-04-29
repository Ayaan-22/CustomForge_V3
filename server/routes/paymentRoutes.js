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

// Webhook for Stripe (No protect middleware here)
router.route('/webhook')
  .post(handleWebhook);

// Authenticated Payment Operations
router.use(protect);

router.route('/create-payment-intent')
  .post(createPaymentIntent);

router.route('/payment-methods')
  .get(getPaymentMethods) // List methods
  .post(savePaymentMethod); // Save new method

export default router;