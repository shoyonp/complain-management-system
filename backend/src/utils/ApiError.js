// Operational errors use one of the blueprint's stable error codes so the
// frontend can branch on `error.code` instead of message text.
export class ApiError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message = 'Request validation failed.', details) {
    return new ApiError(400, 'VALIDATION_ERROR', message, details);
  }

  static unauthenticated(message = 'Authentication is required.') {
    return new ApiError(401, 'UNAUTHENTICATED', message);
  }

  static forbidden(message = 'You do not have access to this resource.') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static profileRequired(message = 'Complete your profile to continue.') {
    return new ApiError(403, 'PROFILE_REQUIRED', message);
  }

  static accountNotActive(message = 'Your account is not active.') {
    return new ApiError(403, 'ACCOUNT_NOT_ACTIVE', message);
  }

  static emailNotVerified(message = 'Verify your email address to continue.') {
    return new ApiError(403, 'EMAIL_NOT_VERIFIED', message);
  }

  static notFound(message = 'Resource not found.') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static conflict(message = 'Request conflicts with the current state.') {
    return new ApiError(409, 'CONFLICT', message);
  }

  static tooManyRequests(message = 'Too many requests. Please try again later.') {
    return new ApiError(429, 'RATE_LIMITED', message);
  }
}
