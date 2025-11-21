// server/controllers/authController.js

import rateLimit from "express-rate-limit";
import asyncHandler from "express-async-handler";

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
import AppError from "../utils/appError.js";
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
    Date.now() +
      (Number(process.env.JWT_COOKIE_EXPIRES_IN || 7) * 24 * 60 * 60 * 1000)
  ),
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
};

// ---------- Shared Helpers ----------

const validatePasswordConfirm = (password, passwordConfirm) => {
  if (!password || !passwordConfirm) {
    throw new AppError("Password and passwordConfirm are required", 400);
  }
  if (password !== passwordConfirm) {
    throw new AppError("Passwords do not match", 400);
  }
};

const getUserWithPassword = async (email) => {
  // Include password & 2FA secret for login flow
  return await User.findOne({ email }).select("+password +twoFactorSecret");
};

const handleEmailError = async (user, tokenFields, error, next, logContext) => {
  tokenFields.forEach((field) => {
    user[field] = undefined;
  });

  await user.save({ validateBeforeSave: false });

  logger.error(`Email error in ${logContext}`, {
    message: error.message,
    stack: error.stack,
    userId: user._id,
  });

  return next(new AppError("Error sending email", 500));
};

/**
 * Utility: Create and send token with cookie
 */
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id, user.role);
  res.cookie("jwt", token, cookieOptions);

  // Never send password to client, even if somehow selected
  if (user.password) {
    user.password = undefined;
  }

  res.status(statusCode).json({
    status: "success",
    token,
    data: { user },
  });

  logger.info("Auth token issued", { userId: user._id.toString(), role: user.role });
};

// ---------- Controllers ----------

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const signup = asyncHandler(async (req, res, next) => {
  logger.info("Signup start", { email: req.body?.email });
  const { name, email, password, passwordConfirm } = req.body;

  validatePasswordConfirm(password, passwordConfirm);

  const newUser = await User.create({
    name,
    email,
    password,
    isEmailVerified: false,
  });

  const verificationToken = await assignEmailVerificationToUser(newUser);

  try {
    const verificationUrl = `${req.protocol}://${req.get(
      "host"
    )}/api/auth/verify-email/${verificationToken}`;

    await new Email(newUser, verificationUrl).sendWelcome();

    // Do NOT log user in yet – require email verification first
    res.status(201).json({
      status: "success",
      message:
        "User registered successfully. Please check your email to verify your account.",
      data: {
        user: newUser,
      },
    });

    logger.info("Signup success (verification email sent)", {
      userId: newUser._id.toString(),
    });
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
  logger.info("Email verified", { userId: user._id.toString() });
});

/**
 * @desc    Login user (supports 2FA)
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

  // If 2FA is enabled, require a valid TOTP token at login
  if (user.twoFactorEnabled) {
    const twoFactorToken =
      req.body.twoFactorToken || req.headers["x-2fa-token"];

    if (!twoFactorToken) {
      return next(
        new AppError(
          "Two-factor authentication token is required for this account",
          401
        )
      );
    }

    const verified = verify2FAToken(user.twoFactorSecret, twoFactorToken);
    if (!verified) {
      return next(
        new AppError("Invalid two-factor authentication token", 401)
      );
    }
  }

  createSendToken(user, 200, res);
  logger.info("Login success", { userId: user._id.toString() });
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
  try {
    logger.info("Logout", { userId: req.user?.id });
  } catch {
    /* ignore logging errors */
  }
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
    const resetURL = `${req.protocol}://${req.get(
      "host"
    )}/api/auth/reset-password/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: "success",
      message: "Password reset token sent to email",
    });

    logger.info("Password reset token sent", { userId: user._id.toString() });
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
  logger.info("Password reset", { userId: user._id.toString() });
});

/**
 * @desc    Update password when logged in
 * @route   PATCH /api/auth/update-password
 * @access  Private
 */
export const updatePassword = asyncHandler(async (req, res, next) => {
  logger.info("Update password start", { userId: req.user.id });

  const { passwordCurrent, password, passwordConfirm } = req.body;

  if (!passwordCurrent || !password || !passwordConfirm) {
    return next(
      new AppError(
        "Please provide current password, new password and passwordConfirm",
        400
      )
    );
  }

  const user = await User.findById(req.user.id).select("+password");

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  if (!(await user.comparePassword(passwordCurrent))) {
    return next(new AppError("Your current password is wrong.", 401));
  }

  validatePasswordConfirm(password, passwordConfirm);

  user.password = password;
  user.passwordChangedAt = Date.now();
  await user.save();

  createSendToken(user, 200, res);
  logger.info("Password updated", { userId: user._id.toString() });
});

/**
 * @desc    Enable two-factor authentication (requires password)
 * @route   POST /api/auth/2fa/enable
 * @access  Private
 */
export const enableTwoFactor = asyncHandler(async (req, res, next) => {
  logger.info("Enable 2FA start", { userId: req.user.id });

  const { password } = req.body;

  if (!password) {
    return next(
      new AppError("Password is required to enable two-factor authentication", 400)
    );
  }

  const user = await User.findById(req.user.id).select(
    "+password +twoFactorSecret"
  );

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  if (!(await user.comparePassword(password))) {
    return next(new AppError("Incorrect password", 401));
  }

  const secret = generate2FASecret(user.email);

  user.twoFactorSecret = secret.base32;
  user.twoFactorEnabled = false;

  await user.save({ validateBeforeSave: false });

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
 * @desc    Disable two-factor authentication (requires password + valid token)
 * @route   DELETE /api/auth/2fa/disable
 * @access  Private
 */
export const disableTwoFactor = asyncHandler(async (req, res, next) => {
  logger.info("Disable 2FA start", { userId: req.user.id });

  const { password, token } = req.body;

  if (!password || !token) {
    return next(
      new AppError(
        "Password and two-factor token are required to disable 2FA",
        400
      )
    );
  }

  const user = await User.findById(req.user.id).select(
    "+password +twoFactorSecret"
  );

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  if (!(await user.comparePassword(password))) {
    return next(new AppError("Incorrect password", 401));
  }

  const verified = verify2FAToken(user.twoFactorSecret, token);

  if (!verified) {
    return next(new AppError("Invalid verification code", 400));
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    message: "Two-factor authentication disabled successfully",
  });

  logger.info("2FA disabled", { userId: req.user.id });
});

/**
 * @desc    Verify two-factor authentication setup (final step of enabling)
 * @route   POST /api/auth/2fa/verify
 * @access  Private
 */
export const verifyTwoFactor = asyncHandler(async (req, res, next) => {
  logger.info("Verify 2FA start", { userId: req.user.id });

  const { token } = req.body;

  if (!token) {
    return next(new AppError("Verification token is required", 400));
  }

  const user = await User.findById(req.user.id).select("+twoFactorSecret");

  if (!user || !user.twoFactorSecret) {
    return next(new AppError("2FA is not initialized for this user", 400));
  }

  const verified = verify2FAToken(user.twoFactorSecret, token);

  if (!verified) {
    return next(new AppError("Invalid verification code", 400));
  }

  user.twoFactorEnabled = true;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    message: "Two-factor authentication enabled successfully",
  });

  logger.info("2FA enabled", { userId: req.user.id });
});
