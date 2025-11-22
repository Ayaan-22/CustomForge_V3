// File: server/models/Cart.js
import mongoose from "mongoose";

// Configuration constants
const CART_CONSTANTS = {
  MAX_QUANTITY: 10,
  ITEM_EXPIRY_DAYS: 30, // reserved for future cleanup
};

/**
 * Schema for individual cart items
 */
const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Cart item must belong to a product"],
      validate: {
        validator: function (v) {
          return mongoose.Types.ObjectId.isValid(v);
        },
        message: "Invalid product ID",
      },
    },
    quantity: {
      type: Number,
      required: [true, "Item quantity is required"],
      min: [1, "Quantity must be at least 1"],
      max: [CART_CONSTANTS.MAX_QUANTITY, `Quantity cannot exceed ${CART_CONSTANTS.MAX_QUANTITY}`],
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be an integer",
      },
    },
    // Track when item was added for potential expiry/cleanup
    addedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { _id: false }
);

/**
 * Schema for the shopping cart
 */
const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: [true, "Cart must belong to a user"],
      validate: {
        validator: function (v) {
          return mongoose.Types.ObjectId.isValid(v);
        },
        message: "Invalid user ID",
      },
    },
    items: {
      type: [cartItemSchema],
      default: [],
      validate: {
        validator: function (items) {
          // Ensure no duplicate products in cart
          const productIds = items.map((item) => String(item.product));
          const uniqueIds = new Set(productIds);
          return productIds.length === uniqueIds.size;
        },
        message: "Cart cannot contain duplicate products",
      },
    },
    // Only a reference to the coupon; all business validation is done at checkout.
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  }
);

// Indexes for performance optimization
cartSchema.index({ user: 1 }, { unique: true });
cartSchema.index({ user: 1, updatedAt: -1 });
cartSchema.index({ user: 1, "items.product": 1 });

/**
 * Pre-save normalization
 */
cartSchema.pre("save", function (next) {
  try {
    if (!Array.isArray(this.items)) {
      this.items = [];
    }

    if (this.isModified("items")) {
      // Filter invalid items and normalize quantity
      this.items = this.items.filter((it) => {
        if (!it || !it.product) return false;

        const q = Number(it.quantity);
        if (!Number.isFinite(q) || q < 1) return false;

        it.quantity = Math.floor(q);

        if (!it.addedAt) {
          it.addedAt = new Date();
        }

        return true;
      });

      // Re-check duplicates
      const productIds = this.items.map((item) => String(item.product));
      const uniqueIds = new Set(productIds);
      if (productIds.length !== uniqueIds.size) {
        // Let Mongoose validator handle the error message
        return next(new Error("Cart cannot contain duplicate products"));
      }
    }

    return next();
  } catch (err) {
    return next(err);
  }
});

/**
 * Static helper: find or create a cart for a user
 */
cartSchema.statics.findOrCreateByUser = async function (userId, session = null) {
  if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
    throw new Error("Valid user ID is required");
  }

  const query = { user: userId };
  const options = session ? { session } : {};

  let cart = await this.findOne(query, null, options);
  if (!cart) {
    cart = new this({ user: userId, items: [] });
    await cart.save(options);
  }

  return cart;
};

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;
