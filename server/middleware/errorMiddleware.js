import { logger } from './logger.js';

class AppError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400, { path: err.path, value: err.value });
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.keyValue ? Object.values(err.keyValue)[0] : 'unknown';
  const field = err.keyValue ? Object.keys(err.keyValue)[0] : 'unknown';
  const message = `Duplicate field value (${field}: ${value}). Please use another value!`;
  return new AppError(message, 400, { field, value });
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => ({
    field: el.path,
    message: el.message
  }));
  const message = 'Invalid input data';
  return new AppError(message, 400, { errors });
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

const handleRateLimitError = (err) =>
  new AppError(
    'Too many requests from this IP, please try again later',
    429,
    { resetTime: err.resetTime }
  );

const sendErrorDev = (err, req, res) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    error: err,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
    details: err.details
  });
};

const sendErrorProd = (err, req, res) => {
  if (err.isOperational) {
    logger.error({
      message: err.message,
      details: err.details,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      user: req.user?._id
    });

    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      ...(err.details && { details: err.details })
    });
  } else {
    logger.error('Unexpected error:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      user: req.user?._id
    });

    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!'
    });
  }
};

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err, message: err.message };

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    if (error.name === 'RateLimitError') error = handleRateLimitError(error);

    sendErrorProd(error, req, res);
  }
};

// Export all error-related functions
export { 
  AppError, 
  errorHandler,
  handleCastErrorDB,
  handleDuplicateFieldsDB,
  handleValidationErrorDB,
  handleJWTError,
  handleJWTExpiredError,
  handleRateLimitError
};