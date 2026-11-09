import { ROLES, USER_STATUS } from '../../config/constants.js';
import { collection } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { assertUserDocument } from '../users/users.schema.js';

export const registerStudentProfile = async ({ auth, payload }) => {
  if (!auth.email_verified) {
    throw ApiError.emailNotVerified('Verify your email address before completing your profile.');
  }

  if (!auth.email) {
    throw ApiError.badRequest('The authentication token does not contain an email address.');
  }

  const existing = await collection('users').findOne(
    { firebaseUid: auth.uid },
    { projection: { _id: 1 } },
  );
  if (existing) {
    throw ApiError.conflict('A profile already exists for this account.');
  }

  const now = new Date();
  const document = assertUserDocument({
    firebaseUid: auth.uid,
    // Mongoose used to lowercase this; keep the unique index semantics.
    email: auth.email.toLowerCase(),
    name: payload.name,
    ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
    // Server-decided fields — never taken from the request body.
    role: ROLES.STUDENT,
    status: USER_STATUS.PENDING,
    permissions: [],
    studentProfile: {
      studentId: payload.studentId,
      academicDepartment: payload.academicDepartment,
      batch: payload.batch,
      semester: payload.semester,
    },
    departmentRef: null,
    verifiedBy: null,
    verifiedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  try {
    const { insertedId } = await collection('users').insertOne(document);
    return { ...document, _id: insertedId };
  } catch (error) {
    if (error?.code === 11000) {
      throw ApiError.conflict('That email address or student ID is already registered.');
    }
    throw error;
  }
};
