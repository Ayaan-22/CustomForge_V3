// File: server/models/PrebuiltPc.js
import AppError from "../utils/appError.js";
import mongoose from "mongoose";

const prebuiltPcSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "PC must be linked to a product"],
      unique: true,
      immutable: true,
    },
    name: {
      type: String,
      required: [true, "PC name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    category: {
      type: String,
      enum: {
        values: ["gaming", "workstation", "office", "home", "custom"],
        message: "Category {VALUE} is not supported"
      },
      default: "gaming",
    },
    // Removed duplicate price field - using virtual from Product
    cpu: {
      model: {
        type: String,
        required: [true, "CPU model is required"],
      },
      manufacturer: {
        type: String,
        enum: {
          values: ["Intel", "AMD"],
          message: "Manufacturer {VALUE} is not supported"
        },
        required: true,
      },
      cores: {
        type: Number,
        required: true,
      },
      speed: {
        type: Number,
        required: true,
      },
      cache: {
        type: Number,
      },
    },
    gpu: {
      model: {
        type: String,
        required: [true, "GPU model is required"],
      },
      manufacturer: {
        type: String,
        enum: {
          values: ["NVIDIA", "AMD"],
          message: "Manufacturer {VALUE} is not supported"
        },
        required: true,
      },
      vram: {
        type: Number,
        required: true,
      },
    },
    motherboard: {
      model: String,
      formFactor: {
        type: String,
        enum: {
          values: ["ATX", "Micro-ATX", "Mini-ITX"],
          message: "Form factor {VALUE} is not supported"
        },
      },
      chipset: String,
    },
    ram: {
      capacity: {
        type: Number,
        required: true,
      },
      speed: {
        type: Number,
      },
      type: {
        type: String,
        enum: {
          values: ["DDR4", "DDR5"],
          message: "RAM type {VALUE} is not supported"
        },
      },
    },
    storage: [
      {
        type: {
          type: String,
          enum: {
            values: ["SSD", "HDD", "NVMe"],
            message: "Storage type {VALUE} is not supported"
          },
          required: true,
        },
        capacity: {
          type: Number,
          required: true,
        },
      },
    ],
    powerSupply: {
      wattage: {
        type: Number,
        required: true,
      },
      rating: {
        type: String,
        enum: {
          values: ["80+ Bronze", "80+ Silver", "80+ Gold", "80+ Platinum"],
          message: "Power supply rating {VALUE} is not supported"
        },
      },
    },
    case: {
      model: String,
      manufacturer: String,
      color: String,
    },
    coolingSystem: {
      type: {
        type: String,
        enum: {
          values: ["air", "liquid"],
          message: "Cooling type {VALUE} is not supported"
        },
      },
      description: String,
    },
    operatingSystem: {
      type: String,
      enum: {
        values: ["Windows 11", "Windows 10", "Linux", "None"],
        message: "OS {VALUE} is not supported"
      },
    },
    warrantyPeriod: {
      type: Number,
      min: [0, "Warranty period cannot be negative"],
    },
    images: [String],
    stock: {
      type: Number,
      required: true,
      min: [0, "Stock cannot be negative"],
    },
    ratings: {
      average: {
        type: Number,
        min: [0, "Rating cannot be less than 0"],
        max: [5, "Rating cannot exceed 5"],
        default: 0,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    reviews: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        rating: {
          type: Number,
          required: true,
        },
        comment: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    features: [String],
    sku: {
      type: String,
      unique: true,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    versionKey: false,
  }
);

// Virtual for price from linked Product
prebuiltPcSchema.virtual('price').get(function() {
  return this.productDetails?.finalPrice || 0;
});

// Middleware to handle product category
prebuiltPcSchema.pre("save", async function (next) {
  const Product = mongoose.model("Product");
  const product = await Product.findById(this.product);

  if (!product) {
    return next(new AppError("Linked product not found", 400));
  }

  if (product.category !== "Prebuilt PCs") {
    product.category = "Prebuilt PCs";
    await product.save({ validateBeforeSave: false });
  }

  next();
});

// Virtual population
prebuiltPcSchema.virtual("productDetails", {
  ref: "Product",
  localField: "product",
  foreignField: "_id",
  justOne: true,
});

// Automatic population for queries with error handling
prebuiltPcSchema.pre(/^find/, function (next) {
  this.populate({
    path: "productDetails",
    select: "name category brand finalPrice images ratings stock",
    options: { lean: true }
  }).catch(err => {
    console.error('Population failed:', err.message);
  });
  next();
});

export default mongoose.model("PrebuiltPc", prebuiltPcSchema);