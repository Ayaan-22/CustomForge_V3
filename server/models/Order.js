// File: server/models/Order.js
import mongoose from "mongoose";
import AppError from "../utils/appError.js";

/**
 * Schema for order items
 */
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Order item must reference a product"],
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
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
    },
  },
  { _id: false }
);

/**
 * Schema for shipping address
 */
const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: [true, "Full name is required"] },
    address: { type: String, required: [true, "Street address is required"] },
    city: { type: String, required: [true, "City is required"] },
    state: { type: String, required: [true, "State is required"] },
    postalCode: { type: String, required: [true, "Postal code is required"] },
    country: {
      type: String,
      required: [true, "Country is required"],
      default: "United States",
    },
  },
  { _id: false }
);

/**
 * Schema for payment result
 * (made flexible for COD or manual payment methods)
 */
const paymentResultSchema = new mongoose.Schema(
  {
    id: { type: String },
    status: {
      type: String,
      enum: ["succeeded", "failed", "pending", "refunded"],
    },
    update_time: { type: String },
    email_address: {
      type: String,
      match: [/.+\@.+\..+/, "Please fill a valid email address"],
    },
    payment_method: {
      type: String,
      enum: ["stripe", "paypal", "cod"],
      required: true,
    },
  },
  { _id: false }
);

/**
 * Schema for return request
 */
const returnRequestSchema = new mongoose.Schema(
  {
    requestedAt: { type: Date },
    reason: { type: String, trim: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { _id: false }
);

/**
 * Main order schema
 */
const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Order must belong to a user"],
    },
    orderItems: [orderItemSchema],
    shippingAddress: shippingAddressSchema,
    paymentMethod: {
      type: String,
      required: [true, "Payment method is required"],
      enum: ["stripe", "paypal", "cod"],
      default: "stripe",
    },
    paymentResult: paymentResultSchema,
    itemsPrice: {
      type: Number,
      required: [true, "Items price is required"],
      min: 0,
    },
    taxPrice: {
      type: Number,
      required: [true, "Tax price is required"],
      default: 0,
      min: 0,
    },
    shippingPrice: {
      type: Number,
      required: [true, "Shipping price is required"],
      default: 0,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: [true, "Total price is required"],
      min: 0,
    },
    isPaid: { type: Boolean, default: false },
    paidAt: Date,
    isDelivered: { type: Boolean, default: false },
    deliveredAt: Date,
    refundedAt: Date,
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      default: "pending",
    },
    returnRequest: returnRequestSchema,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ---------------------------- Indexes ---------------------------- */
orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ totalPrice: 1 });
orderSchema.index({ "paymentResult.id": 1 });

/* -------------------------- Virtuals ----------------------------- */
/**
 * Virtual: Check if order is still returnable (within 30 days of delivery)
 */
orderSchema.virtual("isReturnable").get(function () {
  if (!this.deliveredAt) return false;
  const diff = Date.now() - new Date(this.deliveredAt).getTime();
  return diff <= 30 * 24 * 60 * 60 * 1000; // 30 days
});

/* ------------------------ Instance Methods ----------------------- */

/**
 * Mark order as paid
 */
orderSchema.methods.markAsPaid = async function (paymentResult) {
  if (this.isPaid) {
    throw new AppError("Order is already paid", 400);
  }

  this.isPaid = true;
  this.paidAt = Date.now();
  this.paymentResult = paymentResult;
  this.status = "processing";
  return this.save();
};

/**
 * Process refund
 */
orderSchema.methods.processRefund = async function () {
  if (this.status !== "delivered") {
    throw new AppError("Only delivered orders can be refunded", 400);
  }
  return this.markAsRefunded();
};

/**
 * Mark order as refunded (restores stock)
 */
orderSchema.methods.markAsRefunded = async function () {
  this.status = "refunded";
  this.refundedAt = Date.now();

  if (this.paymentResult) {
    this.paymentResult.status = "refunded";
  }

  // Restore product stock
  for (const item of this.orderItems) {
    await mongoose
      .model("Product")
      .findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
  }

  return this.save();
};

/**
 * Cancel order (only if unpaid and not delivered)
 */
orderSchema.methods.cancelOrder = async function () {
  if (this.isPaid) {
    throw new AppError(
      "Paid orders cannot be cancelled - request a refund instead",
      400
    );
  }

  if (this.status === "delivered") {
    throw new AppError("Delivered orders cannot be cancelled", 400);
  }

  this.status = "cancelled";

  // Restore stock on cancellation
  for (const item of this.orderItems) {
    await mongoose
      .model("Product")
      .findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
  }

  return this.save();
};

/**
 * Static utility: Get all user orders (for dashboards)
 */
orderSchema.statics.getUserOrders = function (userId) {
  return this.find({ user: userId })
    .sort("-createdAt")
    .select("orderItems totalPrice status createdAt")
    .lean();
};

/* ---------------------------- Model ------------------------------ */
const Order = mongoose.model("Order", orderSchema);
export default Order;