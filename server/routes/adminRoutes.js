// File: server/routes/adminRoutes.js

import express from 'express';
import {
  // Analytics & Dashboard
  getSalesAnalytics,
  getProductStats,
  getDashboardOverview,
  getInventoryAnalytics,

  // User Management
  createUser,
  getAllUsers,
  getUserById,
  deleteUser,
  updateUser,

  // Product Management
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductReviews,
  deleteProductReview,

  // Order Management
  getOrders,
  updateOrderToDelivered,
  processRefund,
  processReturn,
  markOrderAsPaid,
  updateOrderStatus,

  // Coupon Management
  createCoupon,
  getCoupons,
  getCoupon,
  updateCoupon,
  deleteCoupon
} from "../controllers/adminController.js";

import {
  protect,
  verifiedEmail,
  twoFactorAuth,
  restrictTo
} from "../middleware/authMiddleware.js";

import {
  getAllLogs,
  getLogById,
  getAvailableLogDates,
  getLogStats
} from "../controllers/logController.js";

// Rate limiters (centralized config)
import { adminLimiter, logRateLimiter } from "../config/rateLimit.js";

const router = express.Router();

/* ============================================================================
   SECURITY & ACCESS CONTROL
   ========================================================================== */
router.use(protect);
router.use(verifiedEmail);
// router.use(twoFactorAuth);
router.use(restrictTo("admin"));

// Apply global admin-level rate limiting
router.use(adminLimiter);

/* ============================================================================
   ANALYTICS & DASHBOARD ROUTES
   ========================================================================== */
router.get("/analytics/overview", getDashboardOverview);
router.get("/analytics/sales", getSalesAnalytics);
router.get("/analytics/products", getProductStats);
router.get("/analytics/inventory", getInventoryAnalytics);

/* ============================================================================
   USER MANAGEMENT ROUTES
   ========================================================================== */
router.post("/users", createUser);
router.get("/users", getAllUsers);

router
  .route("/users/:id")
  .get(getUserById)
  .patch(updateUser)
  .delete(deleteUser);

/* ============================================================================
   PRODUCT MANAGEMENT ROUTES
   ========================================================================== */
router.get("/products", getAllProducts);
router.post("/products", createProduct);

router
  .route("/products/:id")
  .patch(updateProduct)
  .delete(deleteProduct);

router
  .route("/products/:id/reviews")
  .get(getProductReviews)
  .delete(deleteProductReview);

/* ============================================================================
   ORDER MANAGEMENT ROUTES
   ========================================================================== */
router.get("/orders", getOrders);
router.put("/orders/:id/deliver", updateOrderToDelivered);
router.put("/orders/:id/mark-paid", markOrderAsPaid);
router.put("/orders/:id/status", updateOrderStatus);
router.post("/orders/:id/refund", processRefund);
router.put("/orders/:id/process-return", processReturn);

/* ============================================================================
   COUPON MANAGEMENT ROUTES
   ========================================================================== */
router
  .route("/coupons")
  .post(createCoupon)
  .get(getCoupons);

router
  .route("/coupons/:id")
  .get(getCoupon)
  .patch(updateCoupon)
  .delete(deleteCoupon);

/* ============================================================================
   SYSTEM & LOG MANAGEMENT ROUTES (with logRateLimiter)
   ========================================================================== */
router.use("/logs", logRateLimiter); // Apply ONLY to /logs routes

router.get("/logs", getAllLogs);
router.get("/logs/:id", getLogById);
router.get("/logs/dates/available", getAvailableLogDates);
router.get("/logs/stats", getLogStats);

export default router;