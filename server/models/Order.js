// File: server/models/Order.js
import mongoose from "mongoose";
import AppError from "../utils/appError.js";

const ORDER_CONSTANTS = {
  RETURN_WINDOW_DAYS: 30,
  MAX_ITEMS: 50,
  MAX_NAME_LENGTH: 100,
  MAX_ADDRESS_LENGTH: 200,
  MAX_NOTES_LENGTH: 1000,
};

/**
 * Schema for order items with price snapshot
 */
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Order item must reference a product"],
      validate: {
        validator: function (v) {
          return mongoose.Types.ObjectId.isValid(v);
        },
        message: "Invalid product ID",
      },
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [
        ORDER_CONSTANTS.MAX_NAME_LENGTH,
        `Product name cannot exceed ${ORDER_CONSTANTS.MAX_NAME_LENGTH} characters`,
      ],
    },
    image: {
      type: String,
      required: [true, "Product image is required"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be an integer",
      },
    },
    // Store the price at time of order for audit purposes
    priceSnapshot: {
      type: Number,
      required: [true, "Price snapshot is required"],
      min: [0, "Price snapshot cannot be negative"],
    },
  },
  { _id: false }
);

/**
 * Schema for shipping address
 */
const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: [
        ORDER_CONSTANTS.MAX_NAME_LENGTH,
        `Full name cannot exceed ${ORDER_CONSTANTS.MAX_NAME_LENGTH} characters`,
      ],
    },
    address: {
      type: String,
      required: [true, "Street address is required"],
      trim: true,
      maxlength: [
        ORDER_CONSTANTS.MAX_ADDRESS_LENGTH,
        `Address cannot exceed ${ORDER_CONSTANTS.MAX_ADDRESS_LENGTH} characters`,
      ],
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      maxlength: [
        ORDER_CONSTANTS.MAX_NAME_LENGTH,
        `City name cannot exceed ${ORDER_CONSTANTS.MAX_NAME_LENGTH} characters`,
      ],
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
      maxlength: [
        ORDER_CONSTANTS.MAX_NAME_LENGTH,
        `State name cannot exceed ${ORDER_CONSTANTS.MAX_NAME_LENGTH} characters`,
      ],
    },
    postalCode: {
      type: String,
      required: [true, "Postal code is required"],
      trim: true,
      maxlength: [20, "Postal code cannot exceed 20 characters"],
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      default: "United States",
      trim: true,
      maxlength: [
        ORDER_CONSTANTS.MAX_NAME_LENGTH,
        `Country name cannot exceed ${ORDER_CONSTANTS.MAX_NAME_LENGTH} characters`,
      ],
    },
  },
  { _id: false }
);

/**
 * Schema for coupon snapshot applied to the order
 */
const couponAppliedSchema = new mongoose.Schema(
  {
    code: { type: String, trim: true },
    discountType: { type: String, enum: ["fixed", "percent"] },
    discountValue: { type: Number },
    discountAmount: { type: Number, default: 0 },
  },
  { _id: false }
);

/**
 * Schema for payment result metadata
 */
const paymentResultSchema = new mongoose.Schema(
  {
    id: String,
    status: String,
    update_time: String,
    email_address: String,
    method: String,
  },
  { _id: false }
);

/**
 * Order schema
 */
const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Order must belong to a user"],
    },
    orderItems: {
      type: [orderItemSchema],
      validate: {
        validator: function (items) {
          return Array.isArray(items) && items.length > 0 && items.length <= ORDER_CONSTANTS.MAX_ITEMS;
        },
        message:
          "Order must contain at least 1 item and not exceed " + ORDER_CONSTANTS.MAX_ITEMS + " items",
      },
      required: true,
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: [true, "Shipping address is required"],
    },
    paymentMethod: {
      type: String,
      enum: ["stripe", "paypal", "cod"],
      default: "stripe",
      required: true,
    },
    paymentResult: paymentResultSchema,

    itemsPrice: {
      type: Number,
      required: [true, "Items price is required"],
      min: [0, "Items price cannot be negative"],
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },
    shippingPrice: {
      type: Number,
      required: [true, "Shipping price is required"],
      min: [0, "Shipping price cannot be negative"],
    },
    taxPrice: {
      type: Number,
      required: [true, "Tax price is required"],
      min: [0, "Tax price cannot be negative"],
    },
    totalPrice: {
      type: Number,
      required: [true, "Total price is required"],
      min: [0, "Total price cannot be negative"],
    },

    couponApplied: couponAppliedSchema,

    isPaid: {
      type: Boolean,
      default: false,
    },
    paidAt: Date,

    isDelivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: Date,

    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "delivered", "cancelled", "refunded"],
      default: "pending",
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [
        ORDER_CONSTANTS.MAX_NOTES_LENGTH,
        `Notes cannot exceed ${ORDER_CONSTANTS.MAX_NOTES_LENGTH} characters`,
      ],
    },

    // Idempotency key for order creation
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
    },

    // For return window
    returnRequestedAt: Date,
    returnStatus: {
      type: String,
      enum: ["none", "requested", "approved", "rejected"],
      default: "none",
    },
  },
  {
    timestamps: true,
  }
);

// Basic indexes
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

/**
 * Validate order totals match items/discount/shipping/tax.
 */
orderSchema.methods.validateTotals = function () {
  const itemsPriceCalculated = this.orderItems.reduce(
    (sum, item) => sum + item.priceSnapshot * item.quantity,
    0
  );

  const calculatedTotal =
    itemsPriceCalculated - this.discountAmount + this.taxPrice + this.shippingPrice;

  const tolerance = 0.01;

  if (Math.abs(itemsPriceCalculated - this.itemsPrice) > tolerance) {
    throw new AppError("Items price calculation mismatch", 400);
  }

  if (Math.abs(calculatedTotal - this.totalPrice) > tolerance) {
    throw new AppError("Total price calculation mismatch", 400);
  }

  return true;
};

/**
 * Mark order as paid with payment result
 */
orderSchema.methods.markAsPaid = async function (paymentResult, session = null) {
  if (this.isPaid) {
    throw new AppError("Order is already paid", 400);
  }

  this.isPaid = true;
  this.paidAt = new Date();
  this.status = "paid";
  this.paymentResult = paymentResult || this.paymentResult;

  const saveOptions = session ? { session } : {};
  await this.save(saveOptions);
};

/* ------------------------ Static Methods ------------------------- */

/**
 * Get all user orders with pagination
 */
orderSchema.statics.getUserOrders = function (userId, options = {}) {
  const page = parseInt(options.page, 10) || 1;
  const limit = Math.min(parseInt(options.limit, 10) || 10, 100);
  const skip = (page - 1) * limit;

  return this.find({ user: userId })
    .sort(options.sort || "-createdAt")
    .skip(skip)
    .limit(limit)
    .select(
      options.select ||
        "orderItems totalPrice status createdAt isPaid isDelivered couponApplied"
    )
    .lean();
};

/**
 * Find order by idempotency key
 */
orderSchema.statics.findByIdempotencyKey = function (key) {
  if (!key) return null;
  return this.findOne({ idempotencyKey: key });
};

/**
 * Create order with idempotency check
 */
orderSchema.statics.createWithIdempotency = async function (orderData, session = null) {
  if (orderData.idempotencyKey) {
    const existing = await this.findByIdempotencyKey(orderData.idempotencyKey);
    if (existing) {
      return { order: existing, created: false };
    }
  }

  const saveOptions = session ? { session } : {};
  const order = new this(orderData);
  await order.save(saveOptions);

  return { order, created: true };
};

const Order = mongoose.model("Order", orderSchema);
export default Order;
