import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import AppError from './appError.js';

// Token generation configuration
const TOKEN_CONFIG = {
  JWT: {
    DEFAULT_EXPIRES: '30d',
    SHORT_EXPIRES: '15m'
  },
  VERIFY_EMAIL: {
    EXPIRES: 24 * 60 * 60 * 1000 // 24 hours
  },
  PASSWORD_RESET: {
    EXPIRES: 10 * 60 * 1000 // 10 minutes
  }
};

export const signToken = (userId, role, expiresIn = null) => {
  if (!process.env.JWT_SECRET) {
    throw new AppError.internal('JWT secret is not configured');
  }

  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { 
      expiresIn: expiresIn || process.env.JWT_EXPIRES_IN || TOKEN_CONFIG.JWT.DEFAULT_EXPIRES,
      algorithm: 'HS256'
    }
  );
};

export const verifyToken = (token, secret = process.env.JWT_SECRET) => {
  try {
    return jwt.verify(token, secret, { algorithms: ['HS256'] });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Token has expired', 401, { expiredAt: err.expiredAt });
    }
    throw new AppError('Invalid token', 401);
  }
};

export const createVerifyEmailToken = () => {
  const verifyToken = crypto.randomBytes(32).toString('hex');
  const verifyEmailToken = crypto
    .createHash('sha256')
    .update(verifyToken)
    .digest('hex');

  const verifyEmailExpires = Date.now() + TOKEN_CONFIG.VERIFY_EMAIL.EXPIRES;

  return { verifyToken, verifyEmailToken, verifyEmailExpires };
};

export const createPasswordResetToken = () => {
  const resetToken = crypto.randomBytes(32).toString('hex');
  const passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  const passwordResetExpires = Date.now() + TOKEN_CONFIG.PASSWORD_RESET.EXPIRES;

  return { resetToken, passwordResetToken, passwordResetExpires };
};

export const createAccessRefreshTokens = (userId, role) => {
  const accessToken = signToken(userId, role, TOKEN_CONFIG.JWT.SHORT_EXPIRES);
  const refreshToken = signToken(userId, role, TOKEN_CONFIG.JWT.DEFAULT_EXPIRES);
  
  return { accessToken, refreshToken };
};