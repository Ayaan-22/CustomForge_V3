// File: server/routes/orderRoutes.js
import express from 'express';
import {
  createOrder,
  getOrderById,
  getMyOrders,
  getPaymentStatus,
  updateOrderToDelivered,
  cancelOrder,
  requestReturn,
  processReturn,
  processRefund,
  getOrders,
  markOrderAsPaid,
  updateOrderStatus
} from '../controllers/orderController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

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

// Admin only routes
router.use(restrictTo('admin'));

router.route('/')
  .get(getOrders); // Get all orders (admin)

router.route('/:id/deliver')
  .put(updateOrderToDelivered); // Mark as delivered

router.route('/:id/refund')
  .post(processRefund); // Process refund

router.route('/:id/process-return')
  .put(processReturn); // Process return request

router.route('/:id/mark-paid')
  .put(markOrderAsPaid); // Mark as paid

router.route('/:id/status')
  .put(updateOrderStatus); // Update order status

export default router;