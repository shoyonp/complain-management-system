import { PERMISSIONS, ROLES, USER_STATUS } from '../../src/config/constants.js';
import { User } from '../../src/modules/users/user.model.js';

let counter = 0;

const nextId = () => {
  counter += 1;
  return counter;
};

export const createStudent = (overrides = {}) => {
  const id = nextId();

  return User.create({
    firebaseUid: `fb-created-student-${id}`,
    email: `created.student.${id}@example.com`,
    name: 'Test Student',
    role: ROLES.STUDENT,
    status: USER_STATUS.PENDING,
    studentProfile: {
      studentId: `DIU-2026-${id}`,
      academicDepartment: 'CSE',
      batch: '52',
      semester: '8',
    },
    ...overrides,
  });
};

export const createAdmin = (overrides = {}) =>
  User.create({
    firebaseUid: 'fb-admin-active',
    email: 'admin@example.com',
    name: 'Test Admin',
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
    permissions: [PERMISSIONS.REVEAL_IDENTITY, PERMISSIONS.MANAGE_USERS],
    ...overrides,
  });

export const createOfficer = (overrides = {}) =>
  User.create({
    firebaseUid: 'fb-dept-active',
    email: 'officer@example.com',
    name: 'Test Officer',
    role: ROLES.DEPARTMENT,
    status: USER_STATUS.ACTIVE,
    ...overrides,
  });
