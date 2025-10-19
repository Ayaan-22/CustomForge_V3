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
  getWishlist,
} from "../controllers/productController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ----------- PROTECTED ROUTES -----------
router.get("/wishlist", protect, getWishlist);
router.post("/:id/wishlist", protect, addToWishlist);
router.delete("/:id/wishlist", protect, removeFromWishlist);
router.post("/:id/reviews", protect, createProductReview);

// ----------- PUBLIC ROUTES -----------
router.get("/", getAllProducts);
router.get("/top", getTopProducts);
router.get("/search", searchProducts);
router.get("/categories", getCategories);
router.get("/featured", getFeaturedProducts);
router.get("/category/:category", getProductsByCategory);
router.get("/:id", getProduct);
router.get("/:id/related", getRelatedProducts);

// Admin routes moved to /api/v1/admin/products

export default router;
