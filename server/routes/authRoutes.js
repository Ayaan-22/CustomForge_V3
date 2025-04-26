// File: server/routes/authRoutes.js
import express from 'express';
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
  disableTwoFactor
} from '../controllers/authController.js';
import { loginLimiter } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js'; // Added missing import

const router = express.Router();

// Public routes
router.post('/register', signup); // Changed from /signup to /register for consistency
router.post('/login', loginLimiter, login);
router.get('/logout', logout);
router.get('/verify-email/:token', verifyEmail);

// Password related routes
router.post('/forgot-password', forgotPassword);
router.patch('/reset-password/:token', resetPassword);

// Protected routes (require authentication)
router.use(protect);

router.patch('/update-password', updatePassword);

// Two-factor authentication routes
router.route('/2fa')
  .post(enableTwoFactor)
  .delete(disableTwoFactor);
router.post('/2fa/verify', verifyTwoFactor);

export default router;