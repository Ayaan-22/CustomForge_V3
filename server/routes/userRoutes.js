// server/routes/userRoutes.js

import express from "express";
import {
  getMe,
  updateMe,
  deleteMe,
  getWishlist,
  getUserOrders,
} from "../controllers/userController.js";

import {
  protect,
  verifiedEmail,
  twoFactorAuth,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/* ============================
   ALL ROUTES REQUIRE LOGIN + VERIFIED EMAIL
   ============================ */
router.use(protect);
router.use(verifiedEmail);

/* ============================
   ACCOUNT MANAGEMENT
   ============================ */

// GET profile (no 2FA needed for viewing)
router.get("/me", getMe);

// Update profile (PROTECTED by 2FA)
router.patch("/update-me", twoFactorAuth, updateMe);

// Deactivate account (HIGH-RISK → require 2FA)
router.delete("/delete-me", twoFactorAuth, deleteMe);

/* ============================
   WISHLIST & ORDERS
   ============================ */

// Wishlist - low risk, no 2FA needed
router.get("/wishlist", getWishlist);

// Orders - optional 2FA, but recommended to protect
router.get("/orders", twoFactorAuth, getUserOrders);

export default router;
