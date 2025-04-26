// File: server/routes/cartRoutes.js
import express from 'express';
import {
  getCart,
  addToCart,
  removeFromCart,
  clearCart,
  updateCartItem,
  applyCoupon,
  removeCoupon
} from '../controllers/cartController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.route('/')
  .get(getCart)
  .post(addToCart)
  .delete(clearCart);

router.route('/:productId')
  .patch(updateCartItem)
  .delete(removeFromCart);

// Coupon routes
router.route('/coupon')
  .post(applyCoupon)
  .delete(removeCoupon);

export default router;