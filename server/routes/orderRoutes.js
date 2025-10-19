// File: server/routes/orderRoutes.js
import express from 'express';
import {
  createOrder,
  getOrderById,
  getMyOrders,
  getPaymentStatus,
  cancelOrder,
  requestReturn
} from '../controllers/orderController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// User order routes
router.route('/')
  .post(createOrder) // Create new order
  .get(getMyOrders); // Get logged-in user's orders

router.route('/:id')
  .get(getOrderById); // Get specific order

router.route('/:id/payment-status')
  .get(getPaymentStatus); // Check payment status

router.route('/:id/cancel')
  .put(cancelOrder); // Cancel order

router.route('/:id/return')
  .post(requestReturn); // Request return

// Admin routes moved to /api/v1/admin/orders

export default router;