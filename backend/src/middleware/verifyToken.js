import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Builds the bearer-token middleware around an injected verifier
// (production: firebase-admin; tests: a fake — blueprint §14.1).
export const createVerifyToken = (verifyIdToken, { checkRevoked = false } = {}) =>
  asyncHandler(async (req, _res, next) => {
    const header = req.get('authorization') ?? '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw ApiError.unauthenticated('Missing or malformed Authorization header.');
    }

    let decoded;
    try {
      decoded = await verifyIdToken(token, checkRevoked);
    } catch {
      // Never log the token or the provider error message.
      throw ApiError.unauthenticated('Invalid or expired authentication token.');
    }

    req.auth = decoded;
    next();
  });
