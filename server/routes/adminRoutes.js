// File: server/routes/adminRoutes.js
import express from 'express';
import {
  getSalesAnalytics,
  getProductStats,
  getAllUsers,
  getUserById,
  deleteUser
} from '../controllers/adminController.js';
import { protect } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();

// Apply protection and admin check to all routes
router.use(protect, isAdmin);

// User management
router.get('/users', getAllUsers);
router.route('/users/:id')
  .get(getUserById)
  .delete(deleteUser);

// Analytics
router.get('/analytics/sales', getSalesAnalytics);
router.get('/analytics/products', getProductStats);

export default router;