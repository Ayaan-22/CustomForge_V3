// File: server/routes/orderRoutes.js
import express from "express";
import {
  createOrder,
  getOrderById,
  getMyOrders,
  getPaymentStatus,
  cancelOrder,
  requestReturn
} from "../controllers/orderController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All order routes require authentication
router.use(protect);

/**
 * ORDER CREATION (STRICT COUPON VALIDATION)
 * POST /api/orders → convert cart → order (strict validation here)
 * GET  /api/orders → get user's order history
 */
router.route("/")
  .post(createOrder)
  .get(getMyOrders);

/**
 * ORDER DETAILS
 * GET /api/orders/:id → fetch specific order
 */
router.route("/:id")
  .get(getOrderById);

/**
 * PAYMENT STATUS POLLING
 * GET /api/orders/:id/payment-status
 */
router.route("/:id/payment-status")
  .get(getPaymentStatus);

/**
 * ORDER CANCELLATION
 * PUT /api/orders/:id/cancel
 */
router.route("/:id/cancel")
  .put(cancelOrder);

/**
 * RETURN REQUEST
 * POST /api/orders/:id/return
 */
router.route("/:id/return")
  .post(requestReturn);

export default router;
