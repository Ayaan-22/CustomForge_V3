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
} from '../controllers/adminController.js';
import {
  protect,
  verifiedEmail,
  twoFactorAuth,
  restrictTo
} from '../middleware/authMiddleware.js';
import {
  getAllLogs,
  getLogById,
  getAvailableLogDates,
  getLogStats,
} from "../controllers/logController.js";

const router = express.Router();

// Apply all protection and checks
router.use(protect);
router.use(verifiedEmail);
//router.use(twoFactorAuth);
router.use(restrictTo('admin'));

// ============================================================================
// ANALYTICS & DASHBOARD ROUTES
// ============================================================================

// Dashboard overview with comprehensive metrics
router.get('/analytics/overview', getDashboardOverview);

// Sales analytics with multiple time periods
router.get('/analytics/sales', getSalesAnalytics);

// Product statistics and analytics
router.get('/analytics/products', getProductStats);

// Inventory analytics and stock management
router.get('/analytics/inventory', getInventoryAnalytics);

// ============================================================================
// USER MANAGEMENT ROUTES
// ============================================================================

// User CRUD operations
router.post('/users', createUser);         // Create new user
router.get('/users', getAllUsers);         // Get all users with advanced filtering and pagination

// Individual user operations
router.route('/users/:id')
  .get(getUserById)        // Get user details
  .patch(updateUser)       // Update user information
  .delete(deleteUser);     // Delete user account

// ============================================================================
// PRODUCT MANAGEMENT ROUTES
// ============================================================================

// Product CRUD operations
router.get('/products', getAllProducts);                    // Get all products with advanced filtering
router.post('/products', createProduct);                    // Create new product
router.route('/products/:id')
  .patch(updateProduct)     // Update product details
  .delete(deleteProduct);   // Delete product

// Product review management
router.route('/products/:id/reviews')
  .get(getProductReviews)      // Get all product reviews
  .delete(deleteProductReview); // Delete specific review

// ============================================================================
// ORDER MANAGEMENT ROUTES
// ============================================================================

// Order listing and management
router.get('/orders', getOrders);                          // Get all orders with filtering

// Order status updates
router.put('/orders/:id/deliver', updateOrderToDelivered);  // Mark as delivered
router.put('/orders/:id/mark-paid', markOrderAsPaid);       // Mark as paid
router.put('/orders/:id/status', updateOrderStatus);        // Update order status

// Refund and return processing
router.post('/orders/:id/refund', processRefund);           // Process refund
router.put('/orders/:id/process-return', processReturn);    // Process return request

// ============================================================================
// COUPON MANAGEMENT ROUTES
// ============================================================================

// Coupon CRUD operations
router.route('/coupons')
  .post(createCoupon)       // Create new coupon
  .get(getCoupons);         // Get all coupons

router.route('/coupons/:id')
  .get(getCoupon)           // Get specific coupon
  .patch(updateCoupon)      // Update coupon
  .delete(deleteCoupon);    // Delete coupon

// ============================================================================
// SYSTEM & LOG MANAGEMENT ROUTES
// ============================================================================

// System logs and monitoring
router.get("/logs", getAllLogs);                          // Get all system logs
router.get("/logs/:id", getLogById);                      // Get specific log entry
router.get("/logs/dates/available", getAvailableLogDates); // Get available log dates
router.get("/logs/stats", getLogStats);                   // Get log statistics

export default router;
