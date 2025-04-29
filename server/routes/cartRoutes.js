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

// Cart Routes (must be logged in)
router.use(protect);

// Manage cart
router.route('/')
  .get(getCart)        // View cart
  .post(addToCart)     // Add to cart
  .delete(clearCart);  // Clear cart

router.route('/:productId')
  .patch(updateCartItem)   // Update item quantity
  .delete(removeFromCart); // Remove item

// Manage coupons on cart
router.route('/coupon')
  .post(applyCoupon)
  .delete(removeCoupon);

export default router;