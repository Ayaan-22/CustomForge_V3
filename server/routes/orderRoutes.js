import express from 'express';
import {
  createOrder,
  getOrderById,
  getMyOrders,
  updateOrderToPaid,
  updateOrderToDelivered,
  cancelOrder,
  requestReturn,
  processReturn,
  getOrders
} from '../controllers/orderController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// User order routes
router.route('/')
  .get(getMyOrders)
  .post(createOrder);

router.route('/:id')
  .get(getOrderById);

router.route('/:id/pay')
  .put(updateOrderToPaid);

router.route('/:id/cancel')
  .put(cancelOrder);

router.route('/:id/return')
  .post(requestReturn);

// Admin only routes
router.use(restrictTo('admin'));

router.route('/')
  .get(getOrders);

router.route('/:id/deliver')
  .put(updateOrderToDelivered);

router.route('/:id/process-return')
  .put(processReturn);

export default router;