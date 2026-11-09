import request from 'supertest';
import { ROLES, USER_STATUS, User, createApp } from '../../index.js';
import { as, fakeVerifyIdToken } from '../helpers/auth.js';
import { clearTestDb, startTestDb, stopTestDb } from '../helpers/db.js';
import { createAdmin, createStudent } from '../helpers/factories.js';

const app = createApp({ verifyIdToken: fakeVerifyIdToken });

const profilePayload = (overrides = {}) => ({
  name: 'Nusrat Jahan',
  studentId: 'DIU-2026-100',
  academicDepartment: 'Computer Science and Engineering',
  batch: '52',
  semester: '8',
  ...overrides,
});

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

describe('POST /api/v1/auth/register-profile', () => {
  it('rejects requests without a bearer token', async () => {
    const res = await request(app).post('/api/v1/auth/register-profile').send(profilePayload());

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects an invalid token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register-profile')
      .set(as('forged-token'))
      .send(profilePayload());

    expect(res.status).toBe(401);
  });

  it('rejects an unverified email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register-profile')
      .set(as('student-unverified'))
      .send(profilePayload());

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    expect(await User.countDocuments()).toBe(0);
  });

  it('creates a pending student profile and never returns firebaseUid', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register-profile')
      .set(as('student-pending'))
      .send(profilePayload());

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      email: 'student.pending@example.com',
      role: ROLES.STUDENT,
      status: USER_STATUS.PENDING,
      permissions: [],
      studentProfile: { studentId: 'DIU-2026-100' },
    });
    expect(res.body.data).not.toHaveProperty('firebaseUid');

    const stored = await User.findOne({ firebaseUid: 'fb-student-pending' });
    expect(stored.status).toBe(USER_STATUS.PENDING);
    expect(stored.role).toBe(ROLES.STUDENT);
  });

  it('ignores an attempted role escalation instead of applying it', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register-profile')
      .set(as('student-second'))
      .send({ ...profilePayload(), role: 'admin', status: 'active' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(await User.countDocuments()).toBe(0);
  });

  it('rejects an invalid student id', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register-profile')
      .set(as('student-second'))
      .send(profilePayload({ studentId: 'DIU 2026/100' }));

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'body.studentId' })]),
    );
  });

  it('rejects a second profile for the same Firebase account', async () => {
    await createStudent({ firebaseUid: 'fb-student-active' });

    const res = await request(app)
      .post('/api/v1/auth/register-profile')
      .set(as('student-active'))
      .send(profilePayload());

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects a student id that is already registered to someone else', async () => {
    await createStudent({ studentProfile: { studentId: 'DIU-2026-100' } });

    const res = await request(app)
      .post('/api/v1/auth/register-profile')
      .set(as('student-second'))
      .send(profilePayload());

    expect(res.status).toBe(409);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns PROFILE_REQUIRED when the account has no MongoDB user', async () => {
    const res = await request(app).get('/api/v1/auth/me').set(as('no-profile'));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PROFILE_REQUIRED');
  });

  it('lets a pending student read their own status (for the approval screen)', async () => {
    await createStudent({
      firebaseUid: 'fb-student-pending',
      email: 'student.pending@example.com',
      status: USER_STATUS.PENDING,
    });

    const res = await request(app).get('/api/v1/auth/me').set(as('student-pending'));

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(USER_STATUS.PENDING);
    expect(res.body.data).not.toHaveProperty('firebaseUid');
  });

  it('lets a suspended user read their own status', async () => {
    await createStudent({
      firebaseUid: 'fb-student-suspended',
      email: 'student.suspended@example.com',
      status: USER_STATUS.SUSPENDED,
    });

    const res = await request(app).get('/api/v1/auth/me').set(as('student-suspended'));

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(USER_STATUS.SUSPENDED);
  });
});

describe('PATCH /api/v1/users/me', () => {
  it('updates name and phone', async () => {
    await createStudent({
      firebaseUid: 'fb-student-active',
      email: 'student.active@example.com',
      status: USER_STATUS.ACTIVE,
    });

    const res = await request(app)
      .patch('/api/v1/users/me')
      .set(as('student-active'))
      .send({ name: 'Updated Name', phone: '+8801700000000' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ name: 'Updated Name', phone: '+8801700000000' });
  });

  it('rejects attempts to change role or status', async () => {
    await createStudent({
      firebaseUid: 'fb-student-active',
      email: 'student.active@example.com',
      status: USER_STATUS.ACTIVE,
    });

    const res = await request(app)
      .patch('/api/v1/users/me')
      .set(as('student-active'))
      .send({ role: 'admin' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an empty update', async () => {
    await createStudent({
      firebaseUid: 'fb-student-active',
      email: 'student.active@example.com',
      status: USER_STATUS.ACTIVE,
    });

    const res = await request(app).patch('/api/v1/users/me').set(as('student-active')).send({});

    expect(res.status).toBe(400);
  });

  it('blocks suspended accounts immediately', async () => {
    await createStudent({
      firebaseUid: 'fb-student-suspended',
      email: 'student.suspended@example.com',
      status: USER_STATUS.SUSPENDED,
    });

    const res = await request(app)
      .patch('/api/v1/users/me')
      .set(as('student-suspended'))
      .send({ name: 'Still Trying' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_NOT_ACTIVE');
  });

  it('requires a profile', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set(as('no-profile'))
      .send({ name: 'No Profile' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PROFILE_REQUIRED');
  });

  it('does not allow an admin to edit another user through this route', async () => {
    await createAdmin();

    const res = await request(app)
      .patch('/api/v1/users/me')
      .set(as('admin-active'))
      .send({ name: 'Admin Renamed' });

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('admin@example.com');
  });
});
