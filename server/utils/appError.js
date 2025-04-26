// File: server/utils/appError.js
export default class AppError extends Error {
  constructor(message, statusCode, details = null, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.details = details;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error()).stack;
    }
  }

  static badRequest(message = 'Bad Request', details = null) {
    return new AppError(message, 400, details);
  }

  static unauthorized(message = 'Unauthorized', details = null) {
    return new AppError(message, 401, details);
  }

  static forbidden(message = 'Forbidden', details = null) {
    return new AppError(message, 403, details);
  }

  static notFound(message = 'Not Found', details = null) {
    return new AppError(message, 404, details);
  }

  static conflict(message = 'Conflict', details = null) {
    return new AppError(message, 409, details);
  }

  static internal(message = 'Internal Server Error', details = null) {
    return new AppError(message, 500, details, false);
  }
}