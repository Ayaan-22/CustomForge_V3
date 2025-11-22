// File: server/models/Coupon.js
import mongoose from "mongoose";

const COUPON_CONSTANTS = {
  MIN_CODE_LENGTH: 3,
  MAX_CODE_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_PERCENT_DISCOUNT: 100,
};

/**
 * Schema for coupons
 *
 * Product/category restriction fields are optional:
 * - applicableProducts: only these product IDs can use the coupon
 * - excludedProducts: these product IDs cannot use the coupon
 */
const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      uppercase: true,
      trim: true,
      unique: true,
      minlength: [
        COUPON_CONSTANTS.MIN_CODE_LENGTH,
        `Coupon code must be at least ${COUPON_CONSTANTS.MIN_CODE_LENGTH} characters`,
      ],
      maxlength: [
        COUPON_CONSTANTS.MAX_CODE_LENGTH,
        `Coupon code cannot exceed ${COUPON_CONSTANTS.MAX_CODE_LENGTH} characters`,
      ],
      validate: {
        validator: function (v) {
          // Only alphanumeric and hyphens allowed
          return /^[A-Z0-9-]+$/.test(v);
        },
        message: "Coupon code can only contain letters, numbers, and hyphens",
      },
    },
    discountType: {
      type: String,
      enum: {
        values: ["fixed", "percent"],
        message: "Discount type must be either 'fixed' or 'percent'",
      },
      default: "fixed",
      required: [true, "Discount type is required"],
    },
    discountValue: {
      type: Number,
      required: [true, "Discount value is required"],
      min: [0, "Discount value must be non-negative"],
      validate: {
        validator: function (value) {
          if (this.discountType === "percent" && value > COUPON_CONSTANTS.MAX_PERCENT_DISCOUNT) {
            return false;
          }
          return Number.isFinite(value);
        },
        message: `Invalid discount value. Percentage cannot exceed ${COUPON_CONSTANTS.MAX_PERCENT_DISCOUNT}%`,
      },
    },
    minPurchase: {
      type: Number,
      default: 0,
      min: [0, "Minimum purchase amount must be non-negative"],
      validate: {
        validator: Number.isFinite,
        message: "Minimum purchase must be a valid number",
      },
    },
    maxDiscount: {
      type: Number,
      default: null,
      min: [0, "Maximum discount must be non-negative"],
      validate: {
        validator: function (value) {
          if (value === null || value === undefined) return true;
          return Number.isFinite(value);
        },
        message: "Maximum discount must be a valid number",
      },
    },
    validFrom: {
      type: Date,
      default: Date.now,
      required: [true, "Valid from date is required"],
    },
    validTo: {
      type: Date,
      required: [true, "Valid to date is required"],
      validate: {
        validator: function (value) {
          return !this.validFrom || value > this.validFrom;
        },
        message: "Valid to date must be after valid from date",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // Usage tracking metadata
    usageLimit: {
      type: Number,
      default: null,
      min: [0, "Usage limit must be non-negative"],
      validate: {
        validator: function (value) {
          if (value === null || value === undefined) return true;
          return Number.isInteger(value);
        },
        message: "Usage limit must be an integer",
      },
    },
    timesUsed: {
      type: Number,
      default: 0,
      min: [0, "Times used cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "Times used must be an integer",
      },
    },

    // User-specific usage limit
    perUserLimit: {
      type: Number,
      default: null,
      min: [1, "Per user limit must be at least 1"],
      validate: {
        validator: function (value) {
          if (value === null || value === undefined) return true;
          return Number.isInteger(value);
        },
        message: "Per user limit must be an integer",
      },
    },

    // Optional product-level restrictions
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    excludedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    description: {
      type: String,
      trim: true,
      maxlength: [
        COUPON_CONSTANTS.MAX_DESCRIPTION_LENGTH,
        `Description cannot exceed ${COUPON_CONSTANTS.MAX_DESCRIPTION_LENGTH} characters`,
      ],
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  }
);

// Indexes for performance
couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ isActive: 1, validFrom: 1, validTo: 1 });
couponSchema.index({ validTo: 1 });
couponSchema.index({ timesUsed: 1, usageLimit: 1 });

/**
 * Pre-save validation for business logic
 */
couponSchema.pre("save", function (next) {
  if (this.discountType === "percent" && this.discountValue > COUPON_CONSTANTS.MAX_PERCENT_DISCOUNT) {
    return next(
      new Error(`Percentage discount cannot exceed ${COUPON_CONSTANTS.MAX_PERCENT_DISCOUNT}%`)
    );
  }

  if (this.maxDiscount !== null && this.discountType === "fixed") {
    if (this.maxDiscount < this.discountValue) {
      return next(
        new Error("Maximum discount cannot be less than discount value for fixed type")
      );
    }
  }

  if (this.usageLimit !== null && this.timesUsed > this.usageLimit) {
    return next(new Error("Times used cannot exceed usage limit"));
  }

  return next();
});

/**
 * Find currently active coupon by code (case-insensitive, basic checks).
 */
couponSchema.statics.findActiveByCode = async function (rawCode) {
  if (!rawCode) return null;

  const code = String(rawCode).trim().toUpperCase();
  if (!code || code.length < COUPON_CONSTANTS.MIN_CODE_LENGTH) return null;

  const now = new Date();

  const coupon = await this.findOne({
    code,
    validFrom: { $lte: now },
    validTo: { $gte: now },
    isActive: true,
  });

  if (!coupon) return null;

  if (coupon.usageLimit !== null && coupon.timesUsed >= coupon.usageLimit) {
    return null;
  }

  return coupon;
};

/**
 * Check if coupon is currently valid in terms of active flag, time range and global usage.
 */
couponSchema.methods.isCurrentlyValid = function (now = new Date()) {
  if (!this.isActive) return { valid: false, reason: "Coupon is inactive" };
  if (this.validFrom && this.validFrom > now) {
    return { valid: false, reason: "Coupon is not yet valid" };
  }
  if (this.validTo && this.validTo < now) {
    return { valid: false, reason: "Coupon has expired" };
  }
  if (this.usageLimit !== null && this.timesUsed >= this.usageLimit) {
    return { valid: false, reason: "Coupon usage limit reached" };
  }
  return { valid: true, reason: null };
};

/**
 * Compute discount for a given subtotal, respecting maxDiscount and non-negative constraints.
 */
couponSchema.methods.computeDiscount = function (subtotal) {
  const amount = Number(subtotal) || 0;
  if (amount <= 0) return 0;

  let discount = 0;

  if (this.discountType === "percent") {
    discount = (amount * Number(this.discountValue)) / 100;
  } else {
    discount = Number(this.discountValue);
  }

  if (this.maxDiscount != null && this.maxDiscount >= 0 && discount > this.maxDiscount) {
    discount = this.maxDiscount;
  }

  if (discount > amount) discount = amount;

  return Number(discount.toFixed(2));
};

/**
 * Check product-level applicability of coupon against order items.
 * `orderProductIds` is an array of ObjectId/string IDs.
 */
couponSchema.methods.isApplicableToProducts = function (orderProductIds = []) {
  const ids = orderProductIds.map((id) => String(id));

  if (this.applicableProducts && this.applicableProducts.length > 0) {
    const allowed = new Set(this.applicableProducts.map((p) => String(p)));
    const allAllowed = ids.every((id) => allowed.has(id));
    if (!allAllowed) {
      return {
        valid: false,
        reason: "Coupon is not applicable to some products in the order",
      };
    }
  }

  if (this.excludedProducts && this.excludedProducts.length > 0) {
    const excluded = new Set(this.excludedProducts.map((p) => String(p)));
    const hasExcluded = ids.some((id) => excluded.has(id));
    if (hasExcluded) {
      return {
        valid: false,
        reason: "Coupon cannot be applied to one or more products in the order",
      };
    }
  }

  return { valid: true, reason: null };
};

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
