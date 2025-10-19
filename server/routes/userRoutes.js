// File: server/routes/userRoutes.js

import express from 'express';
import {
  getMe,
  updateMe,
  deleteMe,
  getWishlist,
  getUserOrders
} from '../controllers/userController.js';
import {
  protect,
  restrictTo,
  verifiedEmail,
  twoFactorAuth
} from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require login
router.use(protect);
router.use(verifiedEmail);
//router.use(twoFactorAuth);

// Current user routes
router.get('/me', getMe);
router.patch('/update-me', updateMe);
router.delete('/delete-me', deleteMe);

// Wishlist routes
router.get('/wishlist', getWishlist);

// Order history
router.get('/orders', getUserOrders);

// Admin user management routes moved to /api/v1/admin/users

export default router;
