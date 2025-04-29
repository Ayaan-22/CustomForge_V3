// File: server/models/Game.js
import mongoose from "mongoose";
import AppError from "../utils/appError.js";

const gameSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Game must be linked to a product"],
      unique: true,
      immutable: true,
    },
    genre: {
      type: [
        {
          type: String,
          enum: [
            "Action",
            "Adventure",
            "RPG",
            "Strategy",
            "Sports",
            "Shooter",
            "Puzzle",
            "Racing",
            "Simulation",
            "Horror",
            "Fighting",
            "Survival",
            "MMO",
            "Platformer",
            "Sandbox",
          ],
        },
      ],
      required: [true, "At least one genre is required"],
      validate: {
        validator: (v) => v.length > 0,
        message: "At least one genre must be specified",
      },
    },
    platform: {
      type: [
        {
          type: String,
          enum: ["PC", "PlayStation", "Xbox", "Nintendo", "Mobile", "VR"],
        },
      ],
      required: [true, "At least one platform is required"],
      validate: {
        validator: (v) => v.length > 0,
        message: "At least one platform must be specified",
      },
    },
    developer: {
      type: String,
      required: [true, "Developer is required"],
      maxlength: [100, "Developer name cannot exceed 100 characters"],
    },
    publisher: {
      type: String,
      required: [true, "Publisher is required"],
      maxlength: [100, "Publisher name cannot exceed 100 characters"],
    },
    releaseDate: {
      type: Date,
      required: [true, "Release date is required"],
      validate: {
        validator: (v) => v <= Date.now(),
        message: "Release date cannot be in the future",
      },
    },
    ageRating: {
      type: String,
      required: [true, "Age rating is required"],
      enum: {
        values: ["Everyone", "E10+", "Teen", "Mature", "Adults Only"],
        message: "Invalid age rating",
      },
    },
    multiplayer: {
      type: String,
      enum: ["None", "Local", "Online", "Both"],
      default: "None",
    },
    systemRequirements: {
      minimum: {
        os: { type: String, required: true },
        processor: { type: String, required: true },
        memory: { type: String, required: true },
        graphics: { type: String, required: true },
        storage: { type: String, required: true },
      },
      recommended: {
        os: String,
        processor: String,
        memory: String,
        graphics: String,
        storage: String,
      },
    },
    languages: [
      {
        name: {
          type: String,
          required: true,
          match: [/^[A-Z][a-z]+( [A-Z][a-z]+)*$/, "Invalid language format"],
        },
        interface: { type: Boolean, default: false },
        audio: { type: Boolean, default: false },
        subtitles: { type: Boolean, default: false },
      },
    ],
    edition: {
      type: String,
      enum: ["Standard", "Deluxe", "Collector", "Gold", "Ultimate"],
      default: "Standard",
    },
    metacriticScore: {
      type: Number,
      min: [0, "Score cannot be below 0"],
      max: [100, "Score cannot exceed 100"],
    },
    features: {
      achievements: { type: Boolean, default: false },
      cloudSaves: { type: Boolean, default: false },
      crossPlatform: { type: Boolean, default: false },
      modSupport: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    versionKey: false,
  }
);

// Indexes
gameSchema.index({ genre: 1 });
gameSchema.index({ platform: 1 });
gameSchema.index({ developer: "text", publisher: "text" });
gameSchema.index({ releaseDate: -1 });
gameSchema.index({ metacriticScore: -1 });

// Middleware
gameSchema.pre("save", async function (next) {
  const Product = mongoose.model("Product");
  const product = await Product.findById(this.product);

  if (!product) {
    return next(new AppError("Linked product not found", 400));
  }

  if (product.category !== "Games") {
    product.category = "Games";
    await product.save({ validateBeforeSave: false });
  }

  next();
});

// Virtuals
gameSchema.virtual("productDetails", {
  ref: "Product",
  localField: "product",
  foreignField: "_id",
  justOne: true,
});

// Query middleware to always populate product details
gameSchema.pre(/^find/, function (next) {
  this.populate("productDetails");
  next();
});

const Game = mongoose.model("Game", gameSchema);
export default Game;
