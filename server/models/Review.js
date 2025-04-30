import mongoose from "mongoose";

/**
 * Review Schema
 * Defines the structure for product/game reviews with validation and indexes
 */
const reviewSchema = new mongoose.Schema(
  {
    // Reference to either Product or Game (mutually exclusive)
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: function () {
        return !this.game; // Required if game is not provided
      },
    },
    game: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Game",
      required: function () {
        return !this.product; // Required if product is not provided
      },
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Review must belong to a user"],
    },
    rating: {
      type: Number,
      required: [true, "Please provide a rating between 1 and 5"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    title: {
      type: String,
      required: [true, "Please provide a title for your review"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    comment: {
      type: String,
      required: [true, "Please provide your review comments"],
      maxlength: [500, "Review cannot exceed 500 characters"],
    },
    verifiedPurchase: {
      type: Boolean,
      default: false,
    },
    helpfulVotes: {
      type: Number,
      default: 0,
      min: 0,
    },
    reported: {
      type: Boolean,
      default: false,
    },
    reportReason: String,
    media: [
      {
        type: String, // URLs to images/videos
        validate: {
          validator: function (v) {
            return /\.(jpg|jpeg|png|gif|mp4)$/i.test(v);
          },
          message: (props) => `${props.value} is not a valid media file`,
        },
      },
    ],
    // Game-specific fields
    platform: {
      type: String,
      enum: ["PC", "PlayStation", "Xbox", "Nintendo", "Mobile", "VR"],
      required: function () {
        return !!this.game; // Required only for game reviews
      },
    },
    playtimeHours: {
      type: Number,
      min: 0,
      required: function () {
        return !!this.game; // Required only for game reviews
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ======================
// INDEXES
// ======================

// Prevent duplicate reviews by the same user for the same product/game
reviewSchema.index(
  { user: 1, product: 1 },
  { unique: true, partialFilterExpression: { product: { $exists: true } } }
);

reviewSchema.index(
  { user: 1, game: 1 },
  { unique: true, partialFilterExpression: { game: { $exists: true } } }
);

// Performance indexes
reviewSchema.index({ rating: -1 }); // For sorting by highest rating
reviewSchema.index({ helpfulVotes: -1 }); // For most helpful reviews
reviewSchema.index({ createdAt: -1 }); // For newest reviews
reviewSchema.index({ product: 1, rating: -1 }); // For product-specific ratings
reviewSchema.index({ game: 1, rating: -1 }); // For game-specific ratings

// ======================
// MIDDLEWARE
// ======================

/**
 * Pre-find Hook: Automatically populate user data
 */
reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "name avatar verified",
  });
  next();
});

/**
 * Post-save Hook: Update average ratings
 */
reviewSchema.post("save", function (doc) {
  doc.constructor.calculateAverageRatings(
    doc.product || null,
    doc.game || null
  );
});

/**
 * Post-remove Hook: Update average ratings
 */
reviewSchema.post("remove", function (doc) {
  doc.constructor.calculateAverageRatings(
    doc.product || null,
    doc.game || null
  );
});

// ======================
// METHODS
// ======================

/**
 * Mark review as helpful (increment vote count)
 */
reviewSchema.methods.markHelpful = async function () {
  this.helpfulVotes += 1;
  await this.save();
  return this;
};

/**
 * Report a review
 */
reviewSchema.methods.report = async function (reason) {
  this.reported = true;
  this.reportReason = reason;
  await this.save();
  return this;
};

// ======================
// STATICS
// ======================

/**
 * Calculate and update average ratings for a product/game
 */
reviewSchema.statics.calculateAverageRatings = async function (
  productId,
  gameId
) {
  const targetId = productId || gameId;
  const targetModel = productId ? "Product" : "Game";
  const targetField = productId ? "product" : "game";

  const stats = await this.aggregate([
    {
      $match: { [targetField]: targetId },
    },
    {
      $group: {
        _id: `$${targetField}`,
        nRating: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
  ]);

  const updateData =
    stats.length > 0
      ? {
          average: stats[0].avgRating,
          totalReviews: stats[0].nRating,
        }
      : {
          average: 0,
          totalReviews: 0,
        };

  await mongoose.model(targetModel).findByIdAndUpdate(targetId, {
    ratings: updateData,
  });
};

// ======================
// MODEL EXPORT
// ======================

const Review = mongoose.model("Review", reviewSchema);
export default Review;
