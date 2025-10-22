// File: server/models/Coupon.js
import mongoose from "mongoose";

/**
 * Schema for discount coupons
 */
const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, "Coupon code is required"],
    unique: true,
    trim: true,
    uppercase: true,
  },
  discountType: {
    type: String,
    required: true,
    enum: ["percentage", "fixed"],
    default: "percentage",
  },
  discountValue: {
    type: Number,
    required: true,
    min: [0, "Discount value cannot be negative"],
  },
  validFrom: {
    type: Date,
    required: true,
    default: Date.now,
  },
  validTo: {
    type: Date,
    required: true,
    validate: {
      validator: function (value) {
        return value > this.validFrom;
      },
      message: "Valid to date must be after valid from date",
    },
  },
  minPurchase: {
    type: Number,
    min: [0, "Minimum purchase cannot be negative"],
    default: 0,
  },
  maxDiscount: {
    type: Number,
    min: [0, "Maximum discount cannot be negative"],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes
couponSchema.index({ code: 1, validFrom: 1, validTo: 1 });

/**
 * Static: Find valid coupon by code (returns coupon document or null)
 */
couponSchema.statics.isValidCoupon = async function (code) {
  if (!code) return null;
  const coupon = await this.findOne({
    code,
    validFrom: { $lte: Date.now() },
    validTo: { $gte: Date.now() },
    isActive: true,
  });
  return coupon;
};

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
