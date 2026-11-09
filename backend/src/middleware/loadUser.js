import { collection } from '../config/db.js';
import { USER_STATUS } from '../config/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Attaches the MongoDB user for the verified Firebase token. A signed-in user
// without a profile is not an error for status checks (GET /auth/me), so the
// middleware reports PROFILE_REQUIRED and the client routes to onboarding.
export const loadUser = asyncHandler(async (req, _res, next) => {
  const user = await collection('users').findOne({ firebaseUid: req.auth.uid });

  if (!user) {
    throw ApiError.profileRequired();
  }

  req.user = user;
  next();
});

// Account-state gate for business routes. Kept separate from loadUser so the
// pending-approval screen can read the user's own status (blueprint §4.1).
export const requireActive = (req, _res, next) => {
  if (req.user.status !== USER_STATUS.ACTIVE) {
    throw ApiError.accountNotActive();
  }

  next();
};
