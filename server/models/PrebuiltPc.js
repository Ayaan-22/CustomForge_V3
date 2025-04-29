// File: server/models/PrebuiltPc.js
import AppError from "../utils/appError.js";

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
      enum: ["gaming", "workstation", "office", "home", "custom"],
      default: "gaming",
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    cpu: {
      model: {
        type: String,
        required: [true, "CPU model is required"],
      },
      manufacturer: {
        type: String,
        enum: ["Intel", "AMD"],
        required: true,
      },
      cores: {
        type: Number,
        required: true,
      },
      speed: {
        type: Number, // GHz
        required: true,
      },
      cache: {
        type: Number, // MB
      },
    },
    gpu: {
      model: {
        type: String,
        required: [true, "GPU model is required"],
      },
      manufacturer: {
        type: String,
        enum: ["NVIDIA", "AMD"],
        required: true,
      },
      vram: {
        type: Number, // GB
        required: true,
      },
    },
    motherboard: {
      model: String,
      formFactor: {
        type: String,
        enum: ["ATX", "Micro-ATX", "Mini-ITX"],
      },
      chipset: String,
    },
    ram: {
      capacity: {
        type: Number, // GB
        required: true,
      },
      speed: {
        type: Number, // MHz
      },
      type: {
        type: String,
        enum: ["DDR4", "DDR5"],
      },
    },
    storage: [
      {
        type: {
          type: String,
          enum: ["SSD", "HDD", "NVMe"],
          required: true,
        },
        capacity: {
          type: Number, // GB
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
        enum: ["80+ Bronze", "80+ Silver", "80+ Gold", "80+ Platinum"],
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
        enum: ["air", "liquid"],
      },
      description: String,
    },
    operatingSystem: {
      type: String,
      enum: ["Windows 11", "Windows 10", "Linux", "None"],
    },
    warrantyPeriod: {
      type: Number, // Months
      min: [0, "Warranty period cannot be negative"],
    },
    images: [String], // Array of image URLs
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
    features: [String], // e.g., ['RGB Lighting', 'Wi-Fi 6', 'Bluetooth 5.0']
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

// Automatic population for queries
prebuiltPcSchema.pre(/^find/, function (next) {
  this.populate("productDetails");
  next();
});

export default mongoose.model("PrebuiltPc", prebuiltPcSchema);
