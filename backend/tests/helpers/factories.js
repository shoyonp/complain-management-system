import { PERMISSIONS, ROLES, USER_STATUS } from '../../src/config/constants.js';
import { collection } from '../../src/config/db.js';

let counter = 0;

const nextId = () => {
  counter += 1;
  return counter;
};

// Native driver inserts have no timestamps/defaults; supply both here so every
// fixture matches what the services write.
const insertUser = async (document) => {
  const now = new Date();
  const user = { createdAt: now, updatedAt: now, ...document };

  await collection('users').insertOne(user);
  return user;
};

export const createStudent = (overrides = {}) => {
  const id = nextId();

  return insertUser({
    firebaseUid: `fb-created-student-${id}`,
    email: `created.student.${id}@example.com`,
    name: 'Test Student',
    role: ROLES.STUDENT,
    status: USER_STATUS.PENDING,
    permissions: [],
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
  insertUser({
    firebaseUid: 'fb-admin-active',
    email: 'admin@example.com',
    name: 'Test Admin',
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
    permissions: [PERMISSIONS.REVEAL_IDENTITY, PERMISSIONS.MANAGE_USERS],
    ...overrides,
  });

export const createOfficer = (overrides = {}) =>
  insertUser({
    firebaseUid: 'fb-dept-active',
    email: 'officer@example.com',
    name: 'Test Officer',
    role: ROLES.DEPARTMENT,
    status: USER_STATUS.ACTIVE,
    permissions: [],
    ...overrides,
  });
