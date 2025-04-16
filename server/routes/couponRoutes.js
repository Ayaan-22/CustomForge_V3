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

router.use(protect, restrictTo('admin'));

router.route('/')
  .post(createCoupon)
  .get(getCoupons);

router.route('/:id')
  .get(getCoupon)
  .patch(updateCoupon)
  .delete(deleteCoupon);

export default router;