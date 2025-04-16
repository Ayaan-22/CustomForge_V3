import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import AppError from '../utils/appError.js';
import asyncHandler from 'express-async-handler';

/**
 * @desc    Get user's cart
 * @route   GET /api/cart
 * @access  Private
 */
export const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.id })
    .populate('items.product', 'name finalPrice image stock')
    .populate('coupon', 'code discountType discountValue');

  if (!cart) {
    return res.status(200).json({
      success: true,
      data: { items: [], totalPrice: 0, discount: 0, totalAfterDiscount: 0 }
    });
  }

  // Calculate totals
  let totalPrice = cart.items.reduce(
    (total, item) => total + item.product.finalPrice * item.quantity,
    0
  );

  let discount = 0;
  if (cart.coupon) {
    if (cart.coupon.discountType === 'percentage') {
      discount = totalPrice * (cart.coupon.discountValue / 100);
    } else {
      discount = cart.coupon.discountValue;
    }
  }

  const totalAfterDiscount = totalPrice - discount;

  res.status(200).json({
    success: true,
    data: {
      items: cart.items,
      coupon: cart.coupon,
      totalPrice,
      discount,
      totalAfterDiscount
    }
  });
});

/**
 * @desc    Add item to cart
 * @route   POST /api/cart
 * @access  Private
 */
export const addToCart = asyncHandler(async (req, res, next) => {
  const { productId, quantity = 1 } = req.body;

  // Validate quantity
  if (quantity < 1 || quantity > 10) {
    return next(new AppError('Quantity must be between 1 and 10', 400));
  }

  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }

  if (product.stock < quantity) {
    return next(
      new AppError(
        `Not enough stock available. Only ${product.stock} items left`,
        400
      )
    );
  }

  let cart = await Cart.findOne({ user: req.user.id });

  if (!cart) {
    // Create new cart if doesn't exist
    cart = await Cart.create({
      user: req.user.id,
      items: [{ product: productId, quantity }]
    });
  } else {
    // Check if product already in cart
    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (itemIndex > -1) {
      // Update quantity if product exists
      const newQuantity = cart.items[itemIndex].quantity + quantity;
      if (newQuantity > 10) {
        return next(new AppError('Maximum quantity per product is 10', 400));
      }
      cart.items[itemIndex].quantity = newQuantity;
    } else {
      // Add new item if product not in cart
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();
  }

  const populatedCart = await Cart.populate(cart, {
    path: 'items.product',
    select: 'name finalPrice image stock'
  });

  res.status(200).json({
    success: true,
    data: populatedCart
  });
});

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/cart/:productId
 * @access  Private
 */
export const removeFromCart = asyncHandler(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user.id });

  if (!cart) {
    return next(new AppError('No cart found for this user', 404));
  }

  const itemIndex = cart.items.findIndex(
    item => item.product.toString() === req.params.productId
  );

  if (itemIndex === -1) {
    return next(new AppError('Product not found in cart', 404));
  }

  cart.items.splice(itemIndex, 1);
  await cart.save();

  res.status(200).json({
    success: true,
    data: cart
  });
});

/**
 * @desc    Update cart item quantity
 * @route   PATCH /api/cart/:productId
 * @access  Private
 */
export const updateCartItem = asyncHandler(async (req, res, next) => {
  const { quantity } = req.body;

  if (quantity < 1 || quantity > 10) {
    return next(new AppError('Quantity must be between 1 and 10', 400));
  }

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    return next(new AppError('No cart found for this user', 404));
  }

  const itemIndex = cart.items.findIndex(
    item => item.product.toString() === req.params.productId
  );

  if (itemIndex === -1) {
    return next(new AppError('Product not found in cart', 404));
  }

  // Check stock
  const product = await Product.findById(req.params.productId);
  if (product.stock < quantity) {
    return next(
      new AppError(
        `Not enough stock available. Only ${product.stock} items left`,
        400
      )
    );
  }

  cart.items[itemIndex].quantity = quantity;
  await cart.save();

  res.status(200).json({
    success: true,
    data: cart
  });
});

/**
 * @desc    Apply coupon to cart
 * @route   POST /api/cart/coupon
 * @access  Private
 */
export const applyCoupon = asyncHandler(async (req, res, next) => {
  const { couponCode } = req.body;

  const coupon = await Coupon.findOne({
    code: couponCode,
    validFrom: { $lte: Date.now() },
    validTo: { $gte: Date.now() }
  });

  if (!coupon) {
    return next(new AppError('Invalid or expired coupon', 400));
  }

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    return next(new AppError('No cart found for this user', 404));
  }

  cart.coupon = coupon._id;
  await cart.save();

  res.status(200).json({
    success: true,
    message: 'Coupon applied successfully'
  });
});

/**
 * @desc    Remove coupon from cart
 * @route   DELETE /api/cart/coupon
 * @access  Private
 */
export const removeCoupon = asyncHandler(async (req, res, next) => {
  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    return next(new AppError('No cart found for this user', 404));
  }

  cart.coupon = undefined;
  await cart.save();

  res.status(200).json({
    success: true,
    message: 'Coupon removed successfully'
  });
});

/**
 * @desc    Clear cart
 * @route   DELETE /api/cart
 * @access  Private
 */
export const clearCart = asyncHandler(async (req, res) => {
  await Cart.findOneAndDelete({ user: req.user.id });

  res.status(200).json({
    success: true,
    data: { items: [], totalPrice: 0 }
  });
});