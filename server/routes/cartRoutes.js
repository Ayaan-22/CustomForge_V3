// File: server/routes/cartRoutes.js
import express from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyCoupon,
  removeCoupon
} from "../controllers/cartController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All cart routes require authentication
router.use(protect);

/**
 * CART CRUD
 * GET    /api/cart        → get cart + preview totals
 * POST   /api/cart        → add item
 * DELETE /api/cart        → clear cart
 */
router.route("/")
  .get(getCart)
  .post(addToCart)
  .delete(clearCart);

/**
 * COUPON PREVIEW (not final validation)
 * POST   /api/cart/coupon → apply coupon to cart (preview only)
 * DELETE /api/cart/coupon → remove coupon from cart
 */
router.route("/coupon")
.post(applyCoupon)
.delete(removeCoupon);

/**
 * ITEM-LEVEL OPERATIONS
 * PATCH  /api/cart/:productId → update qty
 * DELETE /api/cart/:productId → remove item
 */
router.route("/:productId")
  .patch(updateCartItem)
  .delete(removeFromCart);

export default router;
