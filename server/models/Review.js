import mongoose from "mongoose";

/**
 * Review Schema
 * Defines the structure for product/game reviews with validation and indexes
 */
const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: function () {
        return !this.game;
      },
    },
    game: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Game",
      required: function () {
        return !this.product;
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
      maxlength: [1000, "Review cannot exceed 1000 characters"],
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
        type: String,
        validate: {
          validator: function (v) {
            return /^https?:\/\/.+\.(jpg|jpeg|png|gif|mp4|webm)(\?.*)?$/i.test(v);
          },
          message: (props) => `${props.value} is not a valid media URL`,
        },
      },
    ],
    platform: {
      type: String,
      enum: {
        values: ["PC", "PlayStation", "Xbox", "Nintendo", "Mobile", "VR"],
        message: "Platform {VALUE} is not supported"
      },
      required: function () {
        return !!this.game;
      },
    },
    playtimeHours: {
      type: Number,
      min: 0,
      max: [10000, "Playtime cannot exceed 10000 hours"],
      required: function () {
        return !!this.game;
      },
    },
    isActive: {
      type: Boolean,
      default: true,
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
  { 
    unique: true, 
    partialFilterExpression: { 
      product: { $exists: true },
      isActive: true 
    } 
  }
);

reviewSchema.index(
  { user: 1, game: 1 },
  { 
    unique: true, 
    partialFilterExpression: { 
      game: { $exists: true },
      isActive: true 
    } 
  }
);

// Performance indexes
reviewSchema.index({ rating: -1 });
reviewSchema.index({ helpfulVotes: -1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ product: 1, rating: -1, isActive: 1 });
reviewSchema.index({ game: 1, rating: -1, isActive: 1 });
reviewSchema.index({ isActive: 1 });

// ======================
// MIDDLEWARE
// ======================

/**
 * Pre-find Hook: Automatically populate user data with error handling
 */
reviewSchema.pre(/^find/, function (next) {
  this.find({ isActive: true });
  
  this.populate({
    path: "user",
    select: "name avatar verified",
    options: { lean: true }
  }).catch(err => {
    console.error('User population failed:', err.message);
  });
  next();
});

/**
 * Post-save Hook: Update average ratings with error handling
 */
reviewSchema.post("save", async function (doc) {
  try {
    await doc.constructor.calculateAverageRatings(
      doc.product || null,
      doc.game || null
    );
  } catch (error) {
    console.error('Failed to update average ratings:', error.message);
  }
});

/**
 * Post-remove Hook: Update average ratings with error handling
 */
reviewSchema.post("remove", async function (doc) {
  try {
    await doc.constructor.calculateAverageRatings(
      doc.product || null,
      doc.game || null
    );
  } catch (error) {
    console.error('Failed to update average ratings after removal:', error.message);
  }
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

/**
 * Soft delete review
 */
reviewSchema.methods.softDelete = async function () {
  this.isActive = false;
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

  try {
    const stats = await this.aggregate([
      {
        $match: { 
          [targetField]: targetId,
          isActive: true 
        },
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
            "ratings.average": parseFloat(stats[0].avgRating.toFixed(1)),
            "ratings.totalReviews": stats[0].nRating,
          }
        : {
            "ratings.average": 0,
            "ratings.totalReviews": 0,
          };

    await mongoose.model(targetModel).findByIdAndUpdate(targetId, updateData);
  } catch (error) {
    console.error('Error calculating average ratings:', error.message);
    throw error;
  }
};

// ======================
// MODEL EXPORT
// ======================

const Review = mongoose.model("Review", reviewSchema);
export default Review;