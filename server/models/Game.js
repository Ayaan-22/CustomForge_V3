import mongoose from 'mongoose';

/**
 * Schema for game-specific attributes
 */
const gameSchema = new mongoose.Schema({
  // Reference to the base Product
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Game must be linked to a product'],
    unique: true
  },

  // Game-specific fields
  genre: {
    type: [String],
    required: [true, 'At least one genre is required'],
    enum: [
      'Action', 'Adventure', 'RPG', 'Strategy', 'Sports',
      'Shooter', 'Puzzle', 'Racing', 'Simulation', 'Horror',
      'Fighting', 'Survival', 'MMO', 'Platformer', 'Sandbox'
    ]
  },
  platform: {
    type: [String],
    required: [true, 'At least one platform is required'],
    enum: ['PC', 'PlayStation', 'Xbox', 'Nintendo', 'Mobile', 'VR']
  },
  developer: {
    type: String,
    required: [true, 'Developer is required']
  },
  publisher: {
    type: String,
    required: [true, 'Publisher is required']
  },
  releaseDate: {
    type: Date,
    required: [true, 'Release date is required']
  },
  ageRating: {
    type: String,
    required: [true, 'Age rating is required'],
    enum: ['Everyone', 'E10+', 'Teen', 'Mature', 'Adults Only']
  },
  multiplayer: {
    type: Boolean,
    default: false
  },
  onlineFeatures: {
    type: Boolean,
    default: false
  },
  systemRequirements: {
    minimum: {
      os: String,
      processor: String,
      memory: String,
      graphics: String,
      storage: String
    },
    recommended: {
      os: String,
      processor: String,
      memory: String,
      graphics: String,
      storage: String
    }
  },
  languages: [{
    name: String,
    interface: Boolean,
    audio: Boolean,
    subtitles: Boolean
  }],
  edition: {
    type: String,
    enum: ['Standard', 'Deluxe', 'Collector', 'Gold', 'Ultimate'],
    default: 'Standard'
  },
  dlcAvailable: {
    type: Boolean,
    default: false
  },
  metacriticScore: {
    type: Number,
    min: 0,
    max: 100
  },
  averagePlaytime: Number, // in hours
  achievements: {
    type: Boolean,
    default: false
  },
  cloudSaves: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
gameSchema.index({ genre: 1 });
gameSchema.index({ platform: 1 });
gameSchema.index({ developer: 1 });
gameSchema.index({ publisher: 1 });
gameSchema.index({ releaseDate: -1 });
gameSchema.index({ metacriticScore: -1 });

/**
 * Middleware: Automatically set product category to 'Games'
 */
gameSchema.pre('save', async function(next) {
  // Ensure the linked product exists
  const product = await mongoose.model('Product').findById(this.product);
  if (!product) {
    throw new Error('Linked product not found');
  }

  // Update product category if not already set to games
  if (product.category !== 'Games') {
    product.category = 'Games';
    await product.save();
  }

  next();
});

/**
 * Virtual: Get populated product data
 */
gameSchema.virtual('productDetails', {
  ref: 'Product',
  localField: 'product',
  foreignField: '_id',
  justOne: true
});

const Game = mongoose.model('Game', gameSchema);
export default Game;