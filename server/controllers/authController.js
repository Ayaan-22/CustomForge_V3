// server/controllers/authController.js

import {
  signToken,
  assignEmailVerificationToUser,
  assignPasswordResetToUser,
  generate2FASecret,
  verify2FAToken,
  verifyEmailToken,
  verifyPasswordResetToken,
} from "../utils/generateToken.js";
import User from "../models/User.js";
import Email from "../utils/email.js";
import asyncHandler from "express-async-handler";
import AppError from "../utils/appError.js";
import rateLimit from "express-rate-limit";
import { logger } from "../middleware/logger.js";

/**
 * Rate limiting for login
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: "Too many login attempts, please try again later",
});

/**
 * JWT Cookie Options
 */
const cookieOptions = {
  expires: new Date(
    Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
  ),
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
};

// Auth Utility Functions
const validatePasswordConfirm = (password, passwordConfirm) => {
  if (password !== passwordConfirm) {
    throw new AppError("Passwords do not match", 400);
  }
};

const getUserWithPassword = async (email) => {
  return await User.findOne({ email }).select("+password");
};

const handleEmailError = async (user, tokenFields, error, next, logContext) => {
  tokenFields.forEach(field => {
    user[field] = undefined;
  });
  
  await user.save({ validateBeforeSave: false });
  
  logger.error(`Email error in ${logContext}`, { 
    message: error.message, 
    stack: error.stack, 
    userId: user._id 
  });
  
  return next(new AppError("Error sending email", 500));
};

/**
 * Utility: Create and send token with cookie
 */
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id, user.role);
  res.cookie("jwt", token, cookieOptions);
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: { user },
  });
  logger.info("Auth token issued", { userId: user._id, role: user.role });
};

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const signup = asyncHandler(async (req, res, next) => {
  logger.info("Signup start", { email: req.body?.email });
  const { name, email, password, passwordConfirm } = req.body;

  validatePasswordConfirm(password, passwordConfirm);

  const newUser = await User.create({ name, email, password });
  const verificationToken = await assignEmailVerificationToUser(newUser);

  try {
    const verificationUrl = `${req.protocol}://${req.get("host")}/api/auth/verify-email/${verificationToken}`;
    await new Email(newUser, verificationUrl).sendWelcome();
    createSendToken(newUser, 201, res);
  } catch (err) {
    await handleEmailError(
      newUser, 
      ["emailVerificationToken", "emailVerificationExpires"], 
      err, 
      next, 
      "signup"
    );
  }
});

/**
 * @desc    Verify email address
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 */
export const verifyEmail = asyncHandler(async (req, res, next) => {
  logger.info("Verify email start");
  
  const user = await verifyEmailToken(req.params.token);

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  createSendToken(user, 200, res);
  logger.info("Email verified", { userId: user._id });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res, next) => {
  logger.info("Login attempt", { email: req.body?.email });
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  const user = await getUserWithPassword(email);

  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  if (!user.isEmailVerified) {
    return next(new AppError("Please verify your email first", 401));
  }

  createSendToken(user, 200, res);
  logger.info("Login success", { userId: user._id });
});

/**
 * @desc    Logout user
 * @route   GET /api/auth/logout
 * @access  Private
 */
export const logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({ status: "success" });
  try { logger.info("Logout", { userId: req.user?.id }); } catch {}
};

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = asyncHandler(async (req, res, next) => {
  logger.info("Forgot password start", { email: req.body?.email });
  const user = await User.findOne({ email: req.body.email });
  if (!user) return next(new AppError("No user with that email", 404));

  const resetToken = await assignPasswordResetToUser(user);

  try {
    const resetURL = `${req.protocol}://${req.get("host")}/api/auth/reset-password/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();
    res
      .status(200)
      .json({ status: "success", message: "Token sent to email!" });
    logger.info("Password reset token sent", { userId: user._id });
  } catch (err) {
    await handleEmailError(
      user,
      ["passwordResetToken", "passwordResetExpires"],
      err,
      next,
      "forgot password"
    );
  }
});

/**
 * @desc    Reset password
 * @route   PATCH /api/auth/reset-password/:token
 * @access  Public
 */
export const resetPassword = asyncHandler(async (req, res, next) => {
  logger.info("Reset password start");
  
  const user = await verifyPasswordResetToken(req.params.token);
  validatePasswordConfirm(req.body.password, req.body.passwordConfirm);

  user.password = req.body.password;
  user.passwordChangedAt = Date.now();
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  createSendToken(user, 200, res);
  logger.info("Password reset", { userId: user._id });
});

/**
 * @desc    Update password when logged in
 * @route   PATCH /api/auth/update-password
 * @access  Private
 */
export const updatePassword = asyncHandler(async (req, res, next) => {
  logger.info("Update password start", { userId: req.user.id });
  const user = await User.findById(req.user.id).select("+password");

  if (!(await user.comparePassword(req.body.passwordCurrent))) {
    return next(new AppError("Your current password is wrong.", 401));
  }

  validatePasswordConfirm(req.body.password, req.body.passwordConfirm);

  user.password = req.body.password;
  user.passwordChangedAt = Date.now();
  await user.save();

  createSendToken(user, 200, res);
  logger.info("Password updated", { userId: user._id });
});

/**
 * @desc    Enable two-factor authentication
 * @route   POST /api/auth/2fa/enable
 * @access  Private
 */
export const enableTwoFactor = asyncHandler(async (req, res, next) => {
  logger.info("Enable 2FA start", { userId: req.user.id });
  const secret = generate2FASecret(req.user.email);
  req.user.twoFactorSecret = secret.base32;
  await req.user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    data: {
      otpauthUrl: secret.otpauth_url,
      secret: secret.base32,
    },
  });
  logger.info("2FA secret issued", { userId: req.user.id });
});

/**
 * @desc    Disable two-factor authentication
 * @route   DELETE /api/auth/2fa/disable
 * @access  Private
 */
export const disableTwoFactor = asyncHandler(async (req, res, next) => {
  logger.info("Disable 2FA start", { userId: req.user.id });
  const { token } = req.body;
  const verified = verify2FAToken(req.user.twoFactorSecret, token);

  if (!verified) {
    return next(new AppError("Invalid verification code", 400));
  }

  req.user.twoFactorEnabled = false;
  req.user.twoFactorSecret = undefined;
  await req.user.save();

  res.status(200).json({
    status: "success",
    message: "Two-factor authentication disabled successfully",
  });
  logger.info("2FA disabled", { userId: req.user.id });
});

/**
 * @desc    Verify two-factor authentication setup
 * @route   POST /api/auth/2fa/verify
 * @access  Private
 */
export const verifyTwoFactor = asyncHandler(async (req, res, next) => {
  logger.info("Verify 2FA start", { userId: req.user.id });
  const { token } = req.body;
  const verified = verify2FAToken(req.user.twoFactorSecret, token);

  if (!verified) {
    return next(new AppError("Invalid verification code", 400));
  }

  req.user.twoFactorEnabled = true;
  await req.user.save();

  res.status(200).json({
    status: "success",
    message: "Two-factor authentication enabled successfully",
  });
  logger.info("2FA enabled", { userId: req.user.id });
});