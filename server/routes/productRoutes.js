// File: server/routes/productRoutes.js
import express from "express";
import {
  // Public endpoints
  getAllProducts,
  getProduct,
  getTopProducts,
  getRelatedProducts,
  searchProducts,
  getCategories,
  getFeaturedProducts,
  getProductsByCategory,

  // Protected user endpoints
  createProductReview,
  addToWishlist,
  removeFromWishlist,
} from "../controllers/productController.js";

import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// ----------- PROTECTED ROUTES -----------
router.post("/:id/wishlist", protect, restrictTo('user', 'admin'), addToWishlist);
router.delete("/:id/wishlist", protect, restrictTo('user', 'admin'), removeFromWishlist);
router.post("/:id/reviews", protect, restrictTo('user', 'admin'), createProductReview);

// ----------- PUBLIC ROUTES -----------
router.get("/", getAllProducts);
router.get("/top", getTopProducts);
router.get("/search", searchProducts);
router.get("/categories", getCategories);
router.get("/featured", getFeaturedProducts);
router.get("/category/:category", getProductsByCategory);
router.get("/:id", getProduct);
router.get("/:id/related", getRelatedProducts);

export default router;