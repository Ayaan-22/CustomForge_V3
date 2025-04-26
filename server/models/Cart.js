// File: server/models/Cart.js
import mongoose from 'mongoose';

/**
 * Schema for individual cart items
 */
const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Cart item must belong to a product']
  },
  quantity: {
    type: Number,
    required: [true, 'Please provide quantity'],
    min: [1, 'Quantity must be at least 1'],
    max: [10, 'Maximum quantity per product is 10'],
    default: 1
  },
  priceAtAddition: {
    type: Number,
    required: [true, 'Price at addition is required']
  }
}, { _id: false }); // Disable _id for subdocuments

/**
 * Schema for the shopping cart
 */
const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Cart must belong to a user'],
    unique: true // Ensures one cart per user
  },
  items: [cartItemSchema],
  coupon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
cartSchema.index({ user: 1 });
cartSchema.index({ 'items.product': 1 });

/**
 * Middleware: Validate stock and set price before saving
 */
cartSchema.pre('save', async function(next) {
  // Skip if no items modified
  if (!this.isModified('items')) return next();
  
  for (const item of this.items) {
    const product = await mongoose.model('Product').findById(item.product);
    
    // Validate product exists and has sufficient stock
    if (!product) {
      throw new Error(`Product ${item.product} not found`);
    }
    if (product.stock < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}. Only ${product.stock} available`);
    }
    
    // Set price at time of addition if not already set
    if (!item.priceAtAddition) {
      item.priceAtAddition = product.finalPrice;
    }
  }
  
  this.lastUpdated = Date.now();
  next();
});

/**
 * Virtual: Calculate cart subtotal (before discounts)
 */
cartSchema.virtual('subtotal').get(function() {
  return this.items.reduce(
    (total, item) => total + (item.priceAtAddition * item.quantity),
    0
  );
});

/**
 * Virtual: Calculate total after applying coupon discount
 */
cartSchema.virtual('total').get(function() {
  let total = this.subtotal;
  
  if (this.coupon) {
    if (this.coupon.discountType === 'percentage') {
      total -= total * (this.coupon.discountValue / 100);
    } else {
      total -= this.coupon.discountValue;
    }
  }
  
  return Math.max(0, total); // Ensure total doesn't go negative
});

/**
 * Method: Add item to cart or update quantity if exists
 */
cartSchema.methods.addItem = async function(productId, quantity) {
  const existingItem = this.items.find(item => 
    item.product.toString() === productId.toString()
  );
  
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    const product = await mongoose.model('Product').findById(productId);
    this.items.push({
      product: productId,
      quantity,
      priceAtAddition: product.finalPrice
    });
  }
  
  return this.save();
};

/**
 * Method: Clear all items from cart
 */
cartSchema.methods.clearCart = function() {
  this.items = [];
  return this.save();
};

const Cart = mongoose.model('Cart', cartSchema);
export default Cart;