// File: server/utils/appError.js

export default class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code
   * @param {object|null} details - Optional additional error info
   * @param {boolean} isOperational - Whether error is operational (trusted)
   * @param {string|null} code - Optional machine-readable error code
   */
  constructor(
    message,
    statusCode,
    details = null,
    isOperational = true,
    code = null
  ) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.details = details;
    this.isOperational = isOperational;
    this.code = code;
    this.timestamp = new Date().toISOString();

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Format the error for JSON responses
   */
  toJSON() {
    const base = {
      status: this.status,
      statusCode: this.statusCode,
      message: this.message,
      timestamp: this.timestamp,
    };
    if (this.details) {
      base.details = this.details;
    }
    if (this.code) {
      base.code = this.code;
    }
    return base;
  }

  // Static helpers for common error types

  static badRequest(message = "Bad Request", details = null, code = null) {
    return new AppError(message, 400, details, true, code);
  }

  static unauthorized(message = "Unauthorized", details = null, code = null) {
    return new AppError(message, 401, details, true, code);
  }

  static forbidden(message = "Forbidden", details = null, code = null) {
    return new AppError(message, 403, details, true, code);
  }

  static notFound(message = "Not Found", details = null, code = null) {
    return new AppError(message, 404, details, true, code);
  }

  static conflict(message = "Conflict", details = null, code = null) {
    return new AppError(message, 409, details, true, code);
  }

  static tooManyRequests(
    message = "Too Many Requests",
    details = null,
    code = null
  ) {
    return new AppError(message, 429, details, true, code);
  }

  static internal(
    message = "Internal Server Error",
    details = null,
    code = null
  ) {
    // Internal errors are not operational by default
    return new AppError(message, 500, details, false, code);
  }
}
