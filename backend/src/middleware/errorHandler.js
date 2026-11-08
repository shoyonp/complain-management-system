import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

const envelope = (code, message, details) => ({
  success: false,
  error: { code, message, ...(details ? { details } : {}) },
});

// Single JSON error shape for every failure (blueprint §5.3).
export const errorHandler = (err, req, res, _next) => {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong.';
  let details;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Request validation failed.';
    details = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
  } else if (err?.name === 'ValidationError' && err?.errors) {
    // Mongoose schema validation.
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Request validation failed.';
    details = Object.values(err.errors).map((issue) => ({
      path: issue.path,
      message: issue.message,
    }));
  } else if (err?.name === 'CastError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Invalid identifier format.';
  } else if (err?.code === 11000) {
    statusCode = 409;
    code = 'CONFLICT';
    message = 'That record already exists.';
  } else if (err?.type === 'entity.parse.failed') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Request body must be valid JSON.';
  } else if (err?.type === 'entity.too.large') {
    statusCode = 413;
    code = 'VALIDATION_ERROR';
    message = 'Request body is too large.';
  }

  if (statusCode >= 500) {
    logger.error('Unhandled request error', {
      method: req.method,
      path: req.path,
      error: err?.message,
      ...(env.NODE_ENV === 'production' ? {} : { stack: err?.stack }),
    });
  } else {
    logger.warn('Request rejected', {
      method: req.method,
      path: req.path,
      statusCode,
      code,
    });
  }

  res.status(statusCode).json(envelope(code, message, details));
};
