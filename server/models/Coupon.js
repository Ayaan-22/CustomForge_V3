// File: server/models/Coupon.js
import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  discountType: {
    type: String,
    required: [true, 'Discount type is required'],
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  discountValue: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [0, 'Discount value cannot be negative']
  },
  validFrom: {
    type: Date,
    required: [true, 'Valid from date is required'],
    default: Date.now
  },
  validTo: {
    type: Date,
    required: [true, 'Valid to date is required'],
    validate: {
      validator: function(value) {
        return value > this.validFrom;
      },
      message: 'Valid to date must be after valid from date'
    }
  },
  minPurchase: {
    type: Number,
    min: [0, 'Minimum purchase cannot be negative']
  },
  maxDiscount: {
    type: Number,
    min: [0, 'Maximum discount cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for code and validity
couponSchema.index({ code: 1, validFrom: 1, validTo: 1 });

// Static method to check coupon validity
couponSchema.statics.isValidCoupon = async function(code) {
  const coupon = await this.findOne({
    code,
    validFrom: { $lte: Date.now() },
    validTo: { $gte: Date.now() },
    isActive: true
  });

  return coupon;
};

const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;