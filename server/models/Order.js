// File: server/models/Order.js
import mongoose from "mongoose";

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
    fullName: {
      type: String,
      required: [true, "Full name is required"]
    },
    address: {
      type: String,
      required: [true, "Street address is required"],
    },
    city: {
      type: String,
      required: [true, "City is required"],
    },
    state: {
      type: String,
      required: [true, "State is required"],
    },
    postalCode: {
      type: String,
      required: [true, "Postal code is required"],
    },
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
 */
const paymentResultSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, "Payment ID is required"]
    },
    status: {
      type: String,
      required: [true, "Payment status is required"],
      enum: ["succeeded", "failed", "pending", "refunded"]
    },
    update_time: {
      type: String,
      required: [true, "Payment update time is required"]
    },
    email_address: {
      type: String,
      required: [true, "Payer email is required"],
      match: [/.+\@.+\..+/, "Please fill a valid email address"]
    },
    payment_method: {
      type: String,
      enum: ["stripe", "paypal", "cod"],
      required: true
    }
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
    refundedAt: Date,
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded"
      ],
      default: "pending",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ totalPrice: 1 });
orderSchema.index({ "paymentResult.id": 1 });

/**
 * Middleware: Update product stock when order is created
 */
orderSchema.pre("save", async function (next) {
  if (this.isNew && this.status === "pending") {
    for (const item of this.orderItems) {
      await mongoose
        .model("Product")
        .findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    }
  }
  next();
});

/**
 * Middleware: Restore stock if order is cancelled or refunded
 */
orderSchema.post("findOneAndUpdate", async function (doc) {
  if (doc && ["cancelled", "refunded"].includes(doc.status)) {
    for (const item of doc.orderItems) {
      await mongoose
        .model("Product")
        .findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    }
  }
});

/**
 * Method: Mark order as paid
 */
orderSchema.methods.markAsPaid = async function(paymentResult) {
  if (this.isPaid) {
    throw new Error("Order is already paid");
  }

  this.isPaid = true;
  this.paidAt = Date.now();
  this.paymentResult = paymentResult;
  this.status = "processing";
  
  return this.save();
};

/**
 * Method: Process refund
 */
orderSchema.methods.processRefund = async function() {
  if (this.status !== 'delivered') {
    throw new Error('Only delivered orders can be refunded');
  }

  this.status = "refunded";
  this.refundedAt = Date.now();
  this.paymentResult.status = "refunded";
  
  return this.save();
};

/**
 * Method: Cancel order
 */
orderSchema.methods.cancelOrder = async function() {
  if (this.isPaid) {
    throw new Error("Paid orders cannot be cancelled - request a refund instead");
  }

  if (this.status === "delivered") {
    throw new Error("Delivered orders cannot be cancelled");
  }

  this.status = "cancelled";
  return this.save();
};

const Order = mongoose.model("Order", orderSchema);
export default Order;