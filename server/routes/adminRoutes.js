// File: server/routes/adminRoutes.js

import express from 'express';
import {
  getSalesAnalytics,
  getProductStats,
  getAllUsers,
  getUserById,
  deleteUser
} from '../controllers/adminController.js';
import {
  protect,
  verifiedEmail,
  twoFactorAuth
} from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();

// Apply all protection and checks
router.use(protect);
router.use(verifiedEmail);
//router.use(twoFactorAuth);
router.use(isAdmin);

// User management
router.get('/users', getAllUsers);
router.route('/users/:id')
  .get(getUserById)
  .delete(deleteUser);

// Analytics
router.get('/analytics/sales', getSalesAnalytics);
router.get('/analytics/products', getProductStats);

export default router;
