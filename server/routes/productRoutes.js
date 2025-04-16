// productRoutes.js
import express from 'express';
import {
  // Public endpoints
  getAllProducts,
  getProduct,
  getTopProducts,
  getRelatedProducts,
  searchProducts,
  
  // Protected user endpoints
  createProductReview,
  addToWishlist,
  removeFromWishlist,
  
  // Admin endpoints
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/productController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllProducts);
router.get('/top', getTopProducts);
router.get('/search', searchProducts);
router.get('/:id', getProduct);
router.get('/:id/related', getRelatedProducts);

// Protected routes (require login)
router.use(protect);

router.post('/:id/reviews', createProductReview);
router.route('/:id/wishlist')
  .post(addToWishlist)
  .delete(removeFromWishlist);

// Admin-only routes
router.use(restrictTo('admin'));

router.post('/', createProduct);
router.route('/:id')
  .patch(updateProduct)
  .delete(deleteProduct);

export default router;