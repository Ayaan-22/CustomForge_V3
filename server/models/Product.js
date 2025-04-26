// File: server/models/Product.js
import mongoose from 'mongoose';

/**
 * Schema for product specifications (attributes)
 */
const specificationSchema = new mongoose.Schema({
  key: {
    type: String,
    required: [true, 'Specification key is required']
  },
  value: {
    type: String,
    required: [true, 'Specification value is required']
  }
}, { _id: false });

/**
 * Main product schema
 */
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'CPU', 'GPU', 'Motherboard', 'RAM', 'Storage', 'PSU',
      'Cooling', 'Case', 'OS', 'Networking', 'RGB', 'CaptureCard',
      'Monitor', 'Keyboard', 'Mouse', 'Mousepad', 'Headset', 'Speakers',
      'Controller', 'ExternalStorage', 'VR', 'StreamingGear', 'Microphone',
      'Webcam', 'GamingChair', 'GamingDesk', 'SoundCard', 'Cables',
      'GamingLaptop', 'Games', 'PCGames', 'ConsoleGames', 'VRGames'
    ]
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true
  },
  specifications: [specificationSchema],
  originalPrice: {
    type: Number,
    required: [true, 'Original price is required'],
    min: [0, 'Price cannot be negative']
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%']
  },
  finalPrice: {
    type: Number,
    min: [0, 'Price cannot be negative']
  },
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative']
  },
  availability: {
    type: String,
    enum: ['In Stock', 'Out of Stock', 'Preorder'],
    default: 'In Stock'
  },
  images: [{
    type: String,
    required: [true, 'At least one image is required'],
    validate: {
      validator: function(v) {
        return /\.(jpg|jpeg|png|webp)$/i.test(v);
      },
      message: props => `${props.value} is not a valid image URL`
    }
  }],
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5']
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  features: {
    type: [String],
    default: []
  },
  warranty: {
    type: String,
    default: '1 year limited warranty'
  },
  weight: {
    type: Number,
    min: 0
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number
  },
  sku: {
    type: String,
    unique: true,
    required: [true, 'SKU is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  salesCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ finalPrice: 1 });
productSchema.index({ 'ratings.average': -1 });
productSchema.index({ salesCount: -1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ isActive: 1 });

/**
 * Virtual: Get all reviews for this product
 */
productSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'product'
});

/**
 * Virtual: Get game details if this is a game product
 */
productSchema.virtual('gameDetails', {
  ref: 'Game',
  localField: '_id',
  foreignField: 'product',
  justOne: true
});

/**
 * Virtual: Calculate discount amount
 */
productSchema.virtual('discountAmount').get(function() {
  return this.originalPrice - this.finalPrice;
});

/**
 * Middleware: Calculate final price and availability before saving
 */
productSchema.pre('save', function(next) {
  // Calculate final price
  this.finalPrice = parseFloat(
    (this.originalPrice * (1 - this.discountPercentage / 100)).toFixed(2)
  );
  
  // Update availability based on stock
  this.availability = this.stock > 0 ? 'In Stock' : 'Out of Stock';
  
  next();
});

/**
 * Method: Increment sales count
 */
productSchema.methods.incrementSales = async function(quantity = 1) {
  this.salesCount += quantity;
  await this.save();
};

/**
 * Method: Update stock level
 */
productSchema.methods.updateStock = async function(newStock) {
  this.stock = newStock;
  this.availability = newStock > 0 ? 'In Stock' : 'Out of Stock';
  await this.save();
};

/**
 * Method: Toggle featured status
 */
productSchema.methods.toggleFeatured = async function() {
  this.isFeatured = !this.isFeatured;
  await this.save();
};

const Product = mongoose.model('Product', productSchema);
export default Product;