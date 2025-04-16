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
  getUserOrders,
  setupTwoFactor,
  verifyTwoFactor,
  disableTwoFactor
} from '../controllers/userController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Current user routes
router.get('/me', getMe);
router.patch('/update-me', updateMe);
router.delete('/delete-me', deleteMe);

// Wishlist routes
router.route('/wishlist')
  .get(getWishlist);

// Order history
router.route('/orders')
  .get(getUserOrders);

// Two-factor authentication
router.route('/2fa/setup')
  .post(setupTwoFactor);

router.route('/2fa/verify')
  .post(verifyTwoFactor);

router.route('/2fa/disable')
  .delete(disableTwoFactor);

// Admin only routes
router.use(restrictTo('admin'));

router.route('/')
  .get(getAllUsers);

router.route('/:id')
  .get(getUser)
  .patch(updateUser)
  .delete(deleteUser);

export default router;