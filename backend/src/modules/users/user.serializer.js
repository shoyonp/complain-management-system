// Role-aware serializers: never return a database document directly
// (blueprint §8.1). `firebaseUid` and other internals stay server-side.

const refId = (value) => {
  if (!value) {
    return null;
  }
  return typeof value === 'object' && value._id ? value._id.toString() : value.toString();
};

const studentProfile = (user) =>
  user.studentProfile?.studentId
    ? {
        studentId: user.studentProfile.studentId,
        academicDepartment: user.studentProfile.academicDepartment ?? null,
        batch: user.studentProfile.batch ?? null,
        semester: user.studentProfile.semester ?? null,
      }
    : null;

const base = (user) => ({
  id: user._id.toString(),
  email: user.email,
  name: user.name,
  phone: user.phone ?? null,
  role: user.role,
  status: user.status,
  permissions: [...user.permissions],
  departmentRef: refId(user.departmentRef),
  studentProfile: studentProfile(user),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// The signed-in user's own profile (GET /auth/me, PATCH /users/me).
export const serializeSelf = (user) => base(user);

// Admin user management (verification queue). Admins need the student ID to
// compare against university records, so it is included for this audience only.
export const serializeAdminUser = (user) => ({
  ...base(user),
  verifiedAt: user.verifiedAt ?? null,
  verifiedBy: refId(user.verifiedBy),
  verificationNote: user.verificationNote ?? null,
});
