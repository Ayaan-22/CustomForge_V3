// server/controllers/couponController.js

import Coupon from "../models/Coupon.js";
import asyncHandler from "express-async-handler";
import AppError from "../utils/appError.js";

/**
 * @desc    Create a new coupon
 * @route   POST /api/coupons
 * @access  Private/Admin
 */
export const createCoupon = asyncHandler(async (req, res, next) => {
  const {
    code,
    discountType,
    discountValue,
    validFrom,
    validTo,
    minPurchase,
    maxDiscount,
  } = req.body;

  if (
    !code ||
    !discountType ||
    discountValue == null ||
    !validFrom ||
    !validTo
  ) {
    return next(
      new AppError("Missing required fields for coupon creation", 400)
    );
  }

  const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });

  if (existingCoupon) {
    return next(new AppError("Coupon code already exists", 400));
  }

  const coupon = await Coupon.create({
    code: code.toUpperCase(),
    discountType,
    discountValue,
    validFrom,
    validTo,
    minPurchase,
    maxDiscount,
    isActive: true,
  });

  res.status(201).json({
    success: true,
    data: coupon,
  });
});

/**
 * @desc    Get all coupons
 * @route   GET /api/coupons
 * @access  Private/Admin
 */
export const getCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ validFrom: -1 });

  res.status(200).json({
    success: true,
    results: coupons.length,
    data: coupons,
  });
});

/**
 * @desc    Get single coupon by ID
 * @route   GET /api/coupons/:id
 * @access  Private/Admin
 */
export const getCoupon = asyncHandler(async (req, res, next) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    return next(new AppError("Coupon not found", 404));
  }

  res.status(200).json({
    success: true,
    data: coupon,
  });
});

/**
 * @desc    Update a coupon
 * @route   PATCH /api/coupons/:id
 * @access  Private/Admin
 */
export const updateCoupon = asyncHandler(async (req, res, next) => {
  const updates = req.body;

  if (updates.code) {
    updates.code = updates.code.toUpperCase();
  }

  const coupon = await Coupon.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!coupon) {
    return next(new AppError("Coupon not found", 404));
  }

  res.status(200).json({
    success: true,
    data: coupon,
  });
});

/**
 * @desc    Delete a coupon
 * @route   DELETE /api/coupons/:id
 * @access  Private/Admin
 */
export const deleteCoupon = asyncHandler(async (req, res, next) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);

  if (!coupon) {
    return next(new AppError("Coupon not found", 404));
  }

  res.status(204).json({
    success: true,
    data: null,
  });
});
