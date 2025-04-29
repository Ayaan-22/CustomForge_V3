// File: server/routes/couponRoutes.js
import express from 'express';
import {
  createCoupon,
  getCoupons,
  getCoupon,
  updateCoupon,
  deleteCoupon
} from '../controllers/couponController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Coupon Routes (admin only)
router.use(protect, restrictTo('admin'));

// CRUD for Coupons
router.route('/')
  .post(createCoupon) // Create
  .get(getCoupons);   // Get all

router.route('/:id')
  .get(getCoupon)      // Get one
  .patch(updateCoupon) // Update
  .delete(deleteCoupon); // Delete

export default router;