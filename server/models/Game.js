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
          enum: {
            values: [
              "Action", "Adventure", "RPG", "Strategy", "Sports", "Shooter", 
              "Puzzle", "Racing", "Simulation", "Horror", "Fighting", 
              "Survival", "MMO", "Platformer", "Sandbox",
            ],
            message: "Genre {VALUE} is not supported"
          },
        },
      ],
      required: [true, "At least one genre is required"],
      validate: {
        validator: (v) => v.length > 0 && v.length <= 5,
        message: "Must have 1-5 genres",
      },
    },
    platform: {
      type: [
        {
          type: String,
          enum: {
            values: ["PC", "PlayStation", "Xbox", "Nintendo", "Mobile", "VR"],
            message: "Platform {VALUE} is not supported"
          },
        },
      ],
      required: [true, "At least one platform is required"],
      validate: {
        validator: (v) => v.length > 0 && v.length <= 3,
        message: "Must have 1-3 platforms",
      },
    },
    developer: {
      type: String,
      required: [true, "Developer is required"],
      maxlength: [100, "Developer name cannot exceed 100 characters"],
      trim: true,
    },
    publisher: {
      type: String,
      required: [true, "Publisher is required"],
      maxlength: [100, "Publisher name cannot exceed 100 characters"],
      trim: true,
    },
    releaseDate: {
      type: Date,
      required: [true, "Release date is required"],
      validate: {
        validator: function(v) {
          return v <= new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        },
        message: "Release date cannot be more than 1 year in the future",
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
      enum: {
        values: ["None", "Local", "Online", "Both"],
        message: "Multiplayer type {VALUE} is not supported"
      },
      default: "None",
    },
    systemRequirements: {
      minimum: {
        os: { type: String, required: true, maxlength: 100 },
        processor: { type: String, required: true, maxlength: 100 },
        memory: { type: String, required: true, maxlength: 50 },
        graphics: { type: String, required: true, maxlength: 100 },
        storage: { type: String, required: true, maxlength: 50 },
      },
      recommended: {
        os: { type: String, maxlength: 100 },
        processor: { type: String, maxlength: 100 },
        memory: { type: String, maxlength: 50 },
        graphics: { type: String, maxlength: 100 },
        storage: { type: String, maxlength: 50 },
      },
    },
    languages: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
          maxlength: 50,
        },
        interface: { type: Boolean, default: false },
        audio: { type: Boolean, default: false },
        subtitles: { type: Boolean, default: false },
      },
    ],
    edition: {
      type: String,
      enum: {
        values: ["Standard", "Deluxe", "Collector", "Gold", "Ultimate"],
        message: "Edition {VALUE} is not supported"
      },
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

// Optimized indexes
gameSchema.index({ genre: 1 });
gameSchema.index({ platform: 1 });
gameSchema.index({ developer: "text", publisher: "text" });
gameSchema.index({ releaseDate: -1 });
gameSchema.index({ metacriticScore: -1 });

// Middleware - Fixed category enforcement
gameSchema.pre("save", async function (next) {
  const Product = mongoose.model("Product");
  const product = await Product.findById(this.product);
  
  if (!product) {
    return next(new AppError("Linked product not found", 400));
  }

  const gameCategories = ["Games", "PCGames", "ConsoleGames", "VRGames"];
  if (!gameCategories.includes(product.category)) {
    return next(new AppError("Product category must be a game category", 400));
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

// Optimized query middleware with error handling
gameSchema.pre(/^find/, function (next) {
  if (this.options.shouldPopulate !== false) {
    this.populate({
      path: "productDetails",
      select: "name category brand finalPrice images ratings",
      options: { lean: true }
    }).catch(err => {
      console.error('Population failed:', err.message);
    });
  }
  next();
});

const Game = mongoose.model("Game", gameSchema);
export default Game;