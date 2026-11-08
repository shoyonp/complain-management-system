import { ROLES, USER_STATUS } from '../../config/constants.js';
import { ApiError } from '../../utils/ApiError.js';
import { User } from '../users/user.model.js';

export const registerStudentProfile = async ({ auth, payload }) => {
  if (!auth.email_verified) {
    throw ApiError.emailNotVerified('Verify your email address before completing your profile.');
  }

  if (!auth.email) {
    throw ApiError.badRequest('The authentication token does not contain an email address.');
  }

  const existing = await User.exists({ firebaseUid: auth.uid });
  if (existing) {
    throw ApiError.conflict('A profile already exists for this account.');
  }

  try {
    return await User.create({
      firebaseUid: auth.uid,
      email: auth.email,
      name: payload.name,
      phone: payload.phone,
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
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw ApiError.conflict('That email address or student ID is already registered.');
    }
    throw error;
  }
};
