// server/routes/authRoutes.js

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

/* ============================
   PUBLIC AUTH ROUTES
   ============================ */
router.post("/register", signup);
router.post("/login", loginLimiter, login);
router.get("/logout", logout);

router.get("/verify-email/:token", verifyEmail);

router.post("/forgot-password", forgotPassword);
router.patch("/reset-password/:token", resetPassword);

/* ============================
   PROTECTED ROUTES – Must be logged in + verified email
   ============================ */
router.use(protect);
router.use(verifiedEmail);

/* ============================
   PASSWORD UPDATE (must have 2FA if enabled)
   ============================ */
router.patch("/update-password", twoFactorAuth, updatePassword);

/* ============================
   2FA SETUP FLOW
   ============================ */

// STEP 1 - Generate secret (NO 2FA required)
router.post("/2fa/enable", enableTwoFactor);

// STEP 2 - Verify secret (NO 2FA required – this is onboarding)
router.post("/2fa/verify", verifyTwoFactor);

// STEP 3 - Disable 2FA (YES 2FA REQUIRED)
router.delete("/2fa/disable", twoFactorAuth, disableTwoFactor);

export default router;
