// File: server/models/Product.js
import mongoose from "mongoose";
import validator from 'validator';

/**
 * Schema for product specifications (attributes)
 */
const specificationSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, "Specification key is required"],
      trim: true,
      maxlength: [100, "Specification key too long"],
    },
    value: {
      type: String,
      required: [true, "Specification value is required"],
      trim: true,
      maxlength: [500, "Specification value too long"],
    },
  },
  { _id: false }
);

/**
 * Main product schema
 */
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [100, "Product name cannot exceed 100 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Prebuilt PCs", "CPU", "GPU", "Motherboard", "RAM", "Storage", 
        "Power Supply", "Cooler", "Case", "OS", "Networking", "RGB", 
        "CaptureCard", "Monitor", "Keyboard", "Mouse", "Mousepad", 
        "Headset", "Speakers", "Controller", "ExternalStorage", "VR", 
        "StreamingGear", "Microphone", "Webcam", "GamingChair", 
        "GamingDesk", "SoundCard", "Cables", "GamingLaptop", "Games", 
        "PCGames", "ConsoleGames", "VRGames",
      ],
      immutable: true,
    },
    brand: {
      type: String,
      required: [true, "Brand is required"],
      trim: true,
      maxlength: [50, "Brand name too long"],
    },
    specifications: [specificationSchema],
    originalPrice: {
      type: Number,
      required: [true, "Original price is required"],
      min: [0, "Price cannot be negative"],
      max: [1000000, "Price too high"],
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
      max: [100, "Discount cannot exceed 100%"],
    },
    finalPrice: {
      type: Number,
      min: [0, "Price cannot be negative"],
    },
    stock: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock cannot be negative"],
      max: [100000, "Stock quantity too high"],
    },
    availability: {
      type: String,
      enum: ["In Stock", "Out of Stock", "Preorder", "Discontinued"],
      default: "In Stock",
    },
    images: [
      {
        type: String,
        required: [true, "At least one image is required"],
        validate: {
          validator: function (v) {
            return validator.isURL(v) && /\.(jpg|jpeg|png|webp|avif)$/i.test(v);
          },
          message: (props) => `${props.value} is not a valid image URL`,
        },
      },
    ],
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
      trim: true,
    },
    ratings: {
      average: {
        type: Number,
        default: 0,
        min: [0, "Rating cannot be negative"],
        max: [5, "Rating cannot exceed 5"],
        set: val => Math.round(val * 10) / 10,
      },
      totalReviews: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    features: {
      type: [String],
      default: [],
      validate: {
        validator: function(features) {
          return features.length <= 20;
        },
        message: 'Cannot have more than 20 features'
      }
    },
    warranty: {
      type: String,
      default: "1 year limited warranty",
      maxlength: [100, "Warranty description too long"],
    },
    weight: {
      type: Number,
      min: 0,
      max: [1000, "Weight too high"],
    },
    dimensions: {
      length: { type: Number, min: 0, max: 1000 },
      width: { type: Number, min: 0, max: 1000 },
      height: { type: Number, min: 0, max: 1000 },
    },
    sku: {
      type: String,
      unique: true,
      required: [true, "SKU is required"],
      match: [/^[A-Z0-9-]+$/, "SKU must contain only uppercase letters, numbers and hyphens"],
      maxlength: [50, "SKU too long"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    salesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Optimized indexes for better query performance
productSchema.index({ name: "text", description: "text", brand: "text" });
productSchema.index({ category: 1, "ratings.average": -1, isActive: 1 });
productSchema.index({ isFeatured: 1, isActive: 1, category: 1 });
productSchema.index({ sku: 1 }, { unique: true });

/**
 * Virtual: Get all reviews for this product
 */
productSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "product",
});

/**
 * Virtual: Get game details if this is a game product
 */
productSchema.virtual("gameDetails", {
  ref: "Game",
  localField: "_id",
  foreignField: "product",
  justOne: true,
});

productSchema.virtual("pcDetails", {
  ref: "PrebuiltPc",
  localField: "_id",
  foreignField: "product",
  justOne: true,
});

/**
 * Virtual: Calculate discount amount
 */
productSchema.virtual("discountAmount").get(function () {
  return this.originalPrice - this.finalPrice;
});

/**
 * Middleware: Calculate final price and availability before saving
 */
productSchema.pre("save", function (next) {
  // Calculate final price
  this.finalPrice = parseFloat(
    (this.originalPrice * (1 - this.discountPercentage / 100)).toFixed(2)
  );

  // Update availability based on stock
  if (this.stock > 0) {
    this.availability = "In Stock";
  } else if (this.availability === "Preorder") {
    // Keep as preorder if already set
  } else {
    this.availability = "Out of Stock";
  }

  next();
});

/**
 * Transaction helper for atomic operations
 */
productSchema.statics.executeInTransaction = async (operations) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await operations(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Static: Atomic stock update to prevent race conditions
 */
productSchema.statics.updateStockAtomic = async function(productId, quantity) {
  const result = await this.findByIdAndUpdate(
    productId,
    { 
      $inc: { stock: quantity },
      $set: { 
        availability: quantity > 0 ? "In Stock" : "Out of Stock" 
      }
    },
    { new: true, runValidators: true }
  );
  
  if (!result) {
    throw new Error('Product not found');
  }
  
  return result;
};

/**
 * Method: Increment sales count atomically
 */
productSchema.methods.incrementSales = async function (quantity = 1) {
  const result = await this.constructor.findByIdAndUpdate(
    this._id,
    { $inc: { salesCount: quantity } },
    { new: true, runValidators: true }
  );
  return result;
};

/**
 * Method: Update stock level atomically
 */
productSchema.methods.updateStock = async function (newStock) {
  const result = await this.constructor.findByIdAndUpdate(
    this._id,
    { 
      $set: { 
        stock: newStock,
        availability: newStock > 0 ? "In Stock" : "Out of Stock"
      }
    },
    { new: true, runValidators: true }
  );
  return result;
};

/**
 * Method: Toggle featured status
 */
productSchema.methods.toggleFeatured = async function () {
  this.isFeatured = !this.isFeatured;
  await this.save();
};

const Product = mongoose.model("Product", productSchema);
export default Product;