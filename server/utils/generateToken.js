// File: server/utils/generateToken.js
import jwt from "jsonwebtoken";
import crypto from "crypto";
import speakeasy from "speakeasy";
import dotenv from "dotenv";
import AppError from "./appError.js";

dotenv.config();

// Validate environment variables
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

// Configuration constants
const JWT_CONFIG = {
  algorithm: process.env.JWT_ALGORITHM || "HS256",
  expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  shortExpires: process.env.JWT_SHORT_EXPIRES_IN || "15m",
  refreshExpires:
    process.env.JWT_REFRESH_EXPIRES_IN || process.env.JWT_EXPIRES_IN || "30d",
};

const TOKEN_EXPIRY = {
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_RESET: 10 * 60 * 1000, // 10 minutes
};

// Core JWT Functions
export const signToken = (userId, role = "user", expiresIn = null) => {
  try {
    return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
      algorithm: JWT_CONFIG.algorithm,
      expiresIn: expiresIn || JWT_CONFIG.expiresIn,
    });
  } catch (err) {
    throw AppError.internal("Failed to sign JWT", {
      originalError: err.message,
    });
  }
};

export const verifyJWT = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: [JWT_CONFIG.algorithm],
    });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw AppError.unauthorized("Token has expired", {
        expiredAt: err.expiredAt,
      });
    }
    throw AppError.unauthorized("Invalid token", { reason: err.message });
  }
};

// Email Verification Token
export const generateEmailVerificationToken = () => {
  const token = crypto.randomBytes(32).toString("hex");
  return {
    token,
    hashedToken: crypto.createHash("sha256").update(token).digest("hex"),
    expires: Date.now() + TOKEN_EXPIRY.EMAIL_VERIFICATION,
  };
};

// Password Reset Token
export const generatePasswordResetToken = () => {
  const token = crypto.randomBytes(32).toString("hex");
  return {
    token,
    hashedToken: crypto.createHash("sha256").update(token).digest("hex"),
    expires: Date.now() + TOKEN_EXPIRY.PASSWORD_RESET,
  };
};

// Two-Factor Authentication
export const generate2FASecret = (email) => {
  return speakeasy.generateSecret({
    name: `GameStore (${email})`,
    length: 20,
  });
};

export const verify2FAToken = (secret, token) => {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 2,
  });
};

// Token Pair Generation
export const generateTokenPair = (userId, role) => {
  return {
    accessToken: signToken(userId, role, JWT_CONFIG.shortExpires),
    refreshToken: signToken(userId, role, JWT_CONFIG.refreshExpires),
  };
};

// User Model Helpers
export const assignEmailVerificationToUser = async (user) => {
  const { token, hashedToken, expires } = generateEmailVerificationToken();
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpires = expires;
  await user.save({ validateBeforeSave: false });
  return token;
};

export const assignPasswordResetToUser = async (user) => {
  const { token, hashedToken, expires } = generatePasswordResetToken();
  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = expires;
  await user.save({ validateBeforeSave: false });
  return token;
};

export default {
  signToken,
  verifyJWT,
  generateEmailVerificationToken,
  generatePasswordResetToken,
  generate2FASecret,
  verify2FAToken,
  generateTokenPair,
  assignEmailVerificationToUser,
  assignPasswordResetToUser,
};
