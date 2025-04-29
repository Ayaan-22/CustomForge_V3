// File: server/routes/authRoutes.js

import express from "express";
import {
  signup,
  login,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  updatePassword,
  enableTwoFactor,
  verifyTwoFactor,
  disableTwoFactor,
} from "../controllers/authController.js";
import { loginLimiter } from "../controllers/authController.js";
import {
  protect,
  verifiedEmail,
  twoFactorAuth,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", signup);
router.post("/login", loginLimiter, login);
router.get("/logout", logout);
router.get("/verify-email/:token", verifyEmail);

// Password recovery routes
router.post("/forgot-password", forgotPassword);
router.patch("/reset-password/:token", resetPassword);

// Authenticated routes
router.use(protect); // Must be logged in
router.use(verifiedEmail); // Must have verified email

// Sensitive routes - Require 2FA if enabled
router.patch("/update-password", twoFactorAuth, updatePassword);

// Two-Factor Authentication setup
router.post("/2fa/enable", twoFactorAuth, enableTwoFactor);
router.post("/2fa/verify", twoFactorAuth, verifyTwoFactor);
router.delete("/2fa/disable", twoFactorAuth, disableTwoFactor);

export default router;
