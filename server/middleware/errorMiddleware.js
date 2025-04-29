// File: server/middleware/errorMiddleware.js

import dotenv from 'dotenv';
import AppError from '../utils/appError.js';
import { logger } from './logger.js';

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'production';

/**
 * Database CastError → bad request
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return AppError.badRequest(message, { path: err.path, value: err.value });
};

/**
 * Mongo duplicate key error → bad request
 */
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue || { _id: 'unknown' })[0];
  const value = err.keyValue[field];
  const message = `Duplicate field value (${field}: ${value}). Please use another value!`;
  return AppError.badRequest(message, { field, value });
};

/**
 * Mongoose validation errors → bad request
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors || {}).map((e) => ({
    field: e.path,
    message: e.message,
  }));
  return AppError.badRequest('Invalid input data', { errors });
};

/**
 * JWT errors → unauthorized
 */
const handleJWTError = () =>
  AppError.unauthorized('Invalid token. Please log in again!');

/**
 * JWT expired → unauthorized
 */
const handleJWTExpiredError = () =>
  AppError.unauthorized('Your token has expired! Please log in again.');

/**
 * Rate limit errors → too many requests
 */
const handleRateLimitError = (err) =>
  new AppError(
    'Too many requests from this IP; please try again later',
    429,
    { resetTime: err.resetTime }
  );

/**
 * Send full error details in development
 */
const sendErrorDev = (err, req, res) => {
  logger.error('[ERROR:DEV]', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    error: err,
  });

  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
    details: err.details,
  });
};

/**
 * Send minimal, operational errors in production
 */
const sendErrorProd = (err, req, res) => {
  if (err.isOperational) {
    logger.error('[ERROR:OPERATIONAL]', {
      message: err.message,
      details: err.details,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      user: req.user?._id,
    });

    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      ...(err.details && { details: err.details }),
    });
  } else {
    // Programming or unknown error: don't leak details
    logger.error('[ERROR:UNEXPECTED]', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      user: req.user?._id,
    });

    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
};

/**
 * Global error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  // Ensure defaults
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    // Copy so we can mutate safely
    let error = Object.assign(Object.create(Object.getPrototypeOf(err)), err);

    if (error.name === 'CastError')           error = handleCastErrorDB(error);
    if (error.code === 11000)                 error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError')     error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError')   error = handleJWTError();
    if (error.name === 'TokenExpiredError')   error = handleJWTExpiredError();
    if (error.name === 'RateLimitError')      error = handleRateLimitError(error);

    sendErrorProd(error, req, res);
  }
};
