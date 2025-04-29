// File: server/routes/userRoutes.js

import express from 'express';
import {
  getAllUsers,
  getUser,
  getMe,
  updateMe,
  deleteMe,
  updateUser,
  deleteUser,
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

// Admin-only routes
router.use(restrictTo('admin'));

router.route('/')
  .get(getAllUsers);

router.route('/:id')
  .get(getUser)
  .patch(updateUser)
  .delete(deleteUser);

export default router;
