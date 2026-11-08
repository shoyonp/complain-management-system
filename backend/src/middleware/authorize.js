import { ApiError } from '../utils/ApiError.js';

// Role gate. Roles always come from the database, never from the token (§7.4).
export const authorize =
  (...allowedRoles) =>
  (req, _res, next) => {
    if (!req.user) {
      throw ApiError.unauthenticated();
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden();
    }

    next();
  };
