export const ROLES = Object.freeze({
  STUDENT: 'student',
  DEPARTMENT: 'department',
  ADMIN: 'admin',
});

export const USER_STATUS = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  REJECTED: 'rejected',
});

// Extra admin capabilities. A permission is never a role (blueprint §1.7).
export const PERMISSIONS = Object.freeze({
  REVEAL_IDENTITY: 'REVEAL_IDENTITY',
  MANAGE_USERS: 'MANAGE_USERS',
});

export const VERIFICATION_DECISIONS = Object.freeze({
  APPROVE: 'approve',
  REJECT: 'reject',
});
