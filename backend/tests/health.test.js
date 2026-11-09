import request from 'supertest';
import { createApp } from '../index.js';
import { fakeVerifyIdToken } from './helpers/auth.js';

const app = createApp({ verifyIdToken: fakeVerifyIdToken });

describe('GET /health', () => {
  it('returns 200 with the success envelope', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      status: 'ok',
      environment: 'test',
      version: expect.any(String),
    });
    expect(res.body.data.uptime).toEqual(expect.any(Number));
    expect(Date.parse(res.body.data.timestamp)).not.toBeNaN();
  });

  it('does not require authentication', async () => {
    const res = await request(app).get('/health');
    expect(res.status).not.toBe(401);
  });
});

describe('unknown routes', () => {
  it('return the standard JSON error envelope', async () => {
    const res = await request(app).get('/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: expect.any(String) },
    });
  });
});
