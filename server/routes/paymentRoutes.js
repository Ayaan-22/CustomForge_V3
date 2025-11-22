// File: server/routes/paymentRoutes.js
import express from "express";
import {
  processPayment,
  createPaymentIntent,
  getPaymentMethods,
  savePaymentMethod
} from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All payment routes require authentication
router.use(protect);

/**
 * PROCESS PAYMENT (STRIPE / PAYPAL / COD)
 */
router.route("/process")
  .post(processPayment);

/**
 * STRIPE CLIENT-SECRET FLOW
 */
router.route("/create-intent")
  .post(createPaymentIntent);

/**
 * USER PAYMENT METHODS (STRIPE STORED CARDS)
 */
router.route("/payment-methods")
  .get(getPaymentMethods)
  .post(savePaymentMethod);

export default router;
