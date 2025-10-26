// File: server/models/Cart.js
import mongoose from "mongoose";

/**
 * Schema for individual cart items
 */
const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Cart item must belong to a product"],
    },
    quantity: {
      type: Number,
      required: [true, "Please provide quantity"],
      min: [1, "Quantity must be at least 1"],
      max: [10, "Maximum quantity per product is 10"],
      default: 1,
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
      required: [true, "Cart must belong to a user"],
      unique: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
cartSchema.index({ "items.product": 1 });

/**
 * Middleware: Validate stock and quantities before saving
 * - This prevents saving carts with invalid quantities or quantities > stock.
 * - Uses a single query to fetch products for performance.
 */
cartSchema.pre("save", async function (next) {
  try {
    // Only validate when items changed
    if (!this.isModified("items")) return next();

    if (!Array.isArray(this.items)) return next();

    // Collect product ids and ensure unique ids in query
    const productIds = [
      ...new Set(
        this.items.map((i) =>
          typeof i.product === "object" && i.product._id
            ? i.product._id.toString()
            : i.product.toString()
        )
      ),
    ];

    if (productIds.length === 0) {
      this.lastUpdated = Date.now();
      return next();
    }

    // Fetch required products in one query
    const products = await mongoose.model("Product").find({ _id: { $in: productIds } }).select("stock name");

    // Build a map for quick lookup
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    // Validate each item
    for (const item of this.items) {
      // quantity range validated by schema, but double-check
      if (typeof item.quantity !== "number" || item.quantity < 1 || item.quantity > 10) {
        return next(new Error("Quantity must be a number between 1 and 10"));
      }

      const prod = productMap.get(
        typeof item.product === "object" && item.product._id
          ? item.product._id.toString()
          : item.product.toString()
      );
      
      if (!prod) {
        return next(new Error(`Product ${item.product} not found`));
      }

      if (prod.stock < item.quantity) {
        return next(new Error(`Insufficient stock for ${prod.name}. Only ${prod.stock} available`));
      }
    }

    this.lastUpdated = Date.now();
    return next();
  } catch (err) {
    return next(err);
  }
});

// Note: Removed async virtuals (subtotal/total) because virtual getters cannot be async.
// Totals should be computed at controller/service level where product prices are available.

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;
