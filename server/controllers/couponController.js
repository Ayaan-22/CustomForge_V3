import Coupon from '../models/Coupon.js';
import asyncHandler from 'express-async-handler';
import AppError from '../utils/appError.js';

export const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create(req.body);
  res.status(201).json({ success: true, data: coupon });
});

export const getCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find();
  res.status(200).json({ success: true, data: coupons });
});

export const getCoupon = asyncHandler(async (req, res, next) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    return next(new AppError('Coupon not found', 404));
  }
  res.status(200).json({ success: true, data: coupon });
});

export const updateCoupon = asyncHandler(async (req, res, next) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  if (!coupon) {
    return next(new AppError('Coupon not found', 404));
  }
  res.status(200).json({ success: true, data: coupon });
});

export const deleteCoupon = asyncHandler(async (req, res, next) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) {
    return next(new AppError('Coupon not found', 404));
  }
  res.status(200).json({ success: true, data: {} });
});