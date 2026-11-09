import request from 'supertest';
import { ROLES, USER_STATUS, User, createApp } from '../../index.js';
import { as, fakeVerifyIdToken } from '../helpers/auth.js';
import { clearTestDb, startTestDb, stopTestDb } from '../helpers/db.js';
import { createAdmin, createOfficer, createStudent } from '../helpers/factories.js';

const app = createApp({ verifyIdToken: fakeVerifyIdToken });

const UNKNOWN_ID = '64b000000000000000000000';

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearTestDb);

describe('GET /api/v1/admin/users', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/admin/users');
    expect(res.status).toBe(401);
  });

  it('forbids students', async () => {
    await createStudent({
      firebaseUid: 'fb-student-active',
      email: 'student.active@example.com',
      status: USER_STATUS.ACTIVE,
    });

    const res = await request(app).get('/api/v1/admin/users').set(as('student-active'));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('forbids department officers', async () => {
    await createOfficer();

    const res = await request(app).get('/api/v1/admin/users').set(as('department-active'));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('blocks a suspended admin', async () => {
    await createAdmin({
      firebaseUid: 'fb-admin-suspended',
      email: 'admin.suspended@example.com',
      status: USER_STATUS.SUSPENDED,
    });

    const res = await request(app).get('/api/v1/admin/users').set(as('admin-suspended'));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_NOT_ACTIVE');
  });

  it('lists users with pagination metadata', async () => {
    await createAdmin();
    await createStudent({ status: USER_STATUS.PENDING });
    await createStudent({ status: USER_STATUS.ACTIVE });
    await createStudent({ status: USER_STATUS.ACTIVE });

    const res = await request(app)
      .get('/api/v1/admin/users?page=1&limit=2')
      .set(as('admin-active'));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toEqual({ page: 1, limit: 2, total: 4, totalPages: 2 });
    expect(res.body.data[0]).not.toHaveProperty('firebaseUid');
  });

  it('filters by status', async () => {
    await createAdmin();
    await createStudent({ status: USER_STATUS.PENDING });
    await createStudent({ status: USER_STATUS.ACTIVE });

    const res = await request(app)
      .get('/api/v1/admin/users?status=pending')
      .set(as('admin-active'));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe(USER_STATUS.PENDING);
  });

  it('searches by student id', async () => {
    await createAdmin();
    await createStudent({ studentProfile: { studentId: 'DIU-2026-777' } });
    await createStudent({ studentProfile: { studentId: 'DIU-2026-888' } });

    const res = await request(app).get('/api/v1/admin/users?q=777').set(as('admin-active'));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].studentProfile.studentId).toBe('DIU-2026-777');
  });

  it('treats search input as literal text, not a regex', async () => {
    await createAdmin();
    await createStudent({ studentProfile: { studentId: 'DIU-2026-777' } });

    const res = await request(app).get('/api/v1/admin/users?q=.*').set(as('admin-active'));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('rejects invalid pagination values', async () => {
    await createAdmin();

    const res = await request(app).get('/api/v1/admin/users?page=0').set(as('admin-active'));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects unknown query parameters', async () => {
    await createAdmin();

    const res = await request(app).get('/api/v1/admin/users?sort=password').set(as('admin-active'));

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/v1/admin/users/:id/verify', () => {
  it('approves a pending student and records the audit trail', async () => {
    const admin = await createAdmin();
    const student = await createStudent({
      firebaseUid: 'fb-student-pending',
      email: 'student.pending@example.com',
      status: USER_STATUS.PENDING,
    });

    const res = await request(app)
      .patch(`/api/v1/admin/users/${student._id}/verify`)
      .set(as('admin-active'))
      .send({ decision: 'approve' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(USER_STATUS.ACTIVE);
    expect(res.body.data.verifiedBy).toBe(admin._id.toString());
    expect(res.body.data.verifiedAt).toEqual(expect.any(String));
  });

  it('rejects a pending student with a note', async () => {
    await createAdmin();
    const student = await createStudent({ status: USER_STATUS.PENDING });

    const res = await request(app)
      .patch(`/api/v1/admin/users/${student._id}/verify`)
      .set(as('admin-active'))
      .send({ decision: 'reject', note: 'Student ID does not match university records.' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(USER_STATUS.REJECTED);
    expect(res.body.data.verificationNote).toBe('Student ID does not match university records.');
  });

  it('refuses to verify an account that is not pending', async () => {
    await createAdmin();
    const student = await createStudent({ status: USER_STATUS.ACTIVE });

    const res = await request(app)
      .patch(`/api/v1/admin/users/${student._id}/verify`)
      .set(as('admin-active'))
      .send({ decision: 'approve' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('refuses to "verify" a non-student account', async () => {
    await createAdmin();
    const officer = await createOfficer();

    const res = await request(app)
      .patch(`/api/v1/admin/users/${officer._id}/verify`)
      .set(as('admin-active'))
      .send({ decision: 'approve' });

    expect(res.status).toBe(409);
  });

  it('returns 404 for an unknown user', async () => {
    await createAdmin();

    const res = await request(app)
      .patch(`/api/v1/admin/users/${UNKNOWN_ID}/verify`)
      .set(as('admin-active'))
      .send({ decision: 'approve' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects a malformed user id', async () => {
    await createAdmin();

    const res = await request(app)
      .patch('/api/v1/admin/users/not-an-id/verify')
      .set(as('admin-active'))
      .send({ decision: 'approve' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'params.id' })]),
    );
  });

  it('rejects an invalid decision', async () => {
    await createAdmin();
    const student = await createStudent({ status: USER_STATUS.PENDING });

    const res = await request(app)
      .patch(`/api/v1/admin/users/${student._id}/verify`)
      .set(as('admin-active'))
      .send({ decision: 'maybe' });

    expect(res.status).toBe(400);
  });

  it('forbids students from verifying accounts', async () => {
    await createStudent({
      firebaseUid: 'fb-student-active',
      email: 'student.active@example.com',
      status: USER_STATUS.ACTIVE,
    });
    const target = await createStudent({ status: USER_STATUS.PENDING });

    const res = await request(app)
      .patch(`/api/v1/admin/users/${target._id}/verify`)
      .set(as('student-active'))
      .send({ decision: 'approve' });

    expect(res.status).toBe(403);
    expect(await User.findById(target._id).then((user) => user.status)).toBe(USER_STATUS.PENDING);
  });
});

describe('role model integrity', () => {
  it('never accepts a role from the client on profile creation', async () => {
    await createAdmin();
    const res = await request(app)
      .post('/api/v1/auth/register-profile')
      .set(as('student-second'))
      .send({
        name: 'Sneaky Student',
        studentId: 'DIU-2026-999',
        academicDepartment: 'CSE',
        batch: '52',
        semester: '8',
        role: ROLES.ADMIN,
      });

    expect(res.status).toBe(400);
    expect(await User.countDocuments({ role: ROLES.ADMIN })).toBe(1);
  });
});
