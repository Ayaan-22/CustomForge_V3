import mongoose from 'mongoose';

/**
 * Schema for reviews
 */
const reviewSchema = new mongoose.Schema(
  {
    // Reference to either Product or Game
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: function() {
        return !this.game; // Required if game is not provided
      }
    },
    game: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game',
      required: function() {
        return !this.product; // Required if product is not provided
      }
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user']
    },
    rating: {
      type: Number,
      required: [true, 'Please provide a rating between 1 and 5'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5']
    },
    title: {
      type: String,
      required: [true, 'Please provide a title for your review'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    comment: {
      type: String,
      required: [true, 'Please provide your review comments'],
      maxlength: [500, 'Review cannot exceed 500 characters']
    },
    verifiedPurchase: {
      type: Boolean,
      default: false
    },
    helpfulVotes: {
      type: Number,
      default: 0,
      min: 0
    },
    reported: {
      type: Boolean,
      default: false
    },
    reportReason: String,
    media: [{
      type: String, // URLs to images/videos
      validate: {
        validator: function(v) {
          return /\.(jpg|jpeg|png|gif|mp4)$/i.test(v);
        },
        message: props => `${props.value} is not a valid media file`
      }
    }],
    platform: {
      type: String,
      enum: ['PC', 'PlayStation', 'Xbox', 'Nintendo', 'Mobile', 'VR'],
      required: function() {
        return !!this.game; // Required only for game reviews
      }
    },
    playtimeHours: {
      type: Number,
      min: 0,
      required: function() {
        return !!this.game; // Required only for game reviews
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound index to prevent duplicate reviews
reviewSchema.index(
  { user: 1, product: 1 }, 
  { unique: true, partialFilterExpression: { product: { $exists: true } } }
);

reviewSchema.index(
  { user: 1, game: 1 }, 
  { unique: true, partialFilterExpression: { game: { $exists: true } } }
);

// Indexes for sorting and filtering
reviewSchema.index({ rating: -1 });
reviewSchema.index({ helpfulVotes: -1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ 'product': 1, rating: -1 });
reviewSchema.index({ 'game': 1, rating: -1 });

/**
 * Middleware: Populate user data when querying reviews
 */
reviewSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'name avatar verified'
  });
  next();
});

/**
 * Method: Increment helpful votes
 */
reviewSchema.methods.markHelpful = async function() {
  this.helpfulVotes += 1;
  await this.save();
  return this;
};

/**
 * Method: Report review
 */
reviewSchema.methods.report = async function(reason) {
  this.reported = true;
  this.reportReason = reason;
  await this.save();
  return this;
};

/**
 * Static: Update product/game ratings when review is created
 */
reviewSchema.statics.calculateAverageRatings = async function(productId, gameId) {
  const targetId = productId || gameId;
  const targetModel = productId ? 'Product' : 'Game';
  const targetField = productId ? 'product' : 'game';

  const stats = await this.aggregate([
    {
      $match: { [targetField]: targetId }
    },
    {
      $group: {
        _id: `$${targetField}`,
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  if (stats.length > 0) {
    await mongoose.model(targetModel).findByIdAndUpdate(targetId, {
      ratings: {
        average: stats[0].avgRating,
        totalReviews: stats[0].nRating
      }
    });
  } else {
    await mongoose.model(targetModel).findByIdAndUpdate(targetId, {
      ratings: {
        average: 0,
        totalReviews: 0
      }
    });
  }
};

/**
 * Middleware: Update ratings after saving
 */
reviewSchema.post('save', function(doc) {
  // Check if this is a product or game review
  const targetField = doc.product ? 'product' : 'game';
  const targetId = doc[targetField];
  
  doc.constructor.calculateAverageRatings(
    targetField === 'product' ? targetId : null,
    targetField === 'game' ? targetId : null
  );
});

/**
 * Middleware: Update ratings after removing
 */
reviewSchema.post('remove', function(doc) {
  const targetField = doc.product ? 'product' : 'game';
  const targetId = doc[targetField];
  
  doc.constructor.calculateAverageRatings(
    targetField === 'product' ? targetId : null,
    targetField === 'game' ? targetId : null
  );
});

const Review = mongoose.model('Review', reviewSchema);
export default Review;