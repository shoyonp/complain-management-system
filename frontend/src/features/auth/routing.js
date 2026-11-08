import { ACCOUNT_STATUS, ROLES } from '../../lib/constants.js';

// Single place that decides where a signed-in user belongs after auth events.
export const postAuthPath = (profile, firebaseUser) => {
  if (firebaseUser && !firebaseUser.emailVerified) {
    return '/verify-email';
  }

  if (!profile) {
    return '/complete-profile';
  }

  if (profile.status !== ACCOUNT_STATUS.ACTIVE) {
    return '/pending-approval';
  }

  if (profile.role === ROLES.ADMIN) {
    return '/admin';
  }

  if (profile.role === ROLES.DEPARTMENT) {
    return '/department';
  }

  return '/student';
};
