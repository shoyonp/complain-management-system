// Fake token verifier for tests (blueprint §14.1). Tokens are plain strings so
// specs read like real requests: `.set(as('admin-active'))`.
export const TOKENS = {
  'student-active': {
    uid: 'fb-student-active',
    email: 'student.active@example.com',
    email_verified: true,
  },
  'student-pending': {
    uid: 'fb-student-pending',
    email: 'student.pending@example.com',
    email_verified: true,
  },
  'student-unverified': {
    uid: 'fb-student-unverified',
    email: 'student.unverified@example.com',
    email_verified: false,
  },
  'student-second': {
    uid: 'fb-student-second',
    email: 'student.second@example.com',
    email_verified: true,
  },
  'student-suspended': {
    uid: 'fb-student-suspended',
    email: 'student.suspended@example.com',
    email_verified: true,
  },
  'department-active': {
    uid: 'fb-dept-active',
    email: 'officer@example.com',
    email_verified: true,
  },
  'admin-active': {
    uid: 'fb-admin-active',
    email: 'admin@example.com',
    email_verified: true,
  },
  'admin-suspended': {
    uid: 'fb-admin-suspended',
    email: 'admin.suspended@example.com',
    email_verified: true,
  },
  'no-profile': {
    uid: 'fb-no-profile',
    email: 'noprofile@example.com',
    email_verified: true,
  },
};

export const fakeVerifyIdToken = async (token) => {
  const decoded = TOKENS[token];

  if (!decoded) {
    throw new Error('Invalid or expired token');
  }

  return decoded;
};

export const as = (token) => ({ Authorization: `Bearer ${token}` });
