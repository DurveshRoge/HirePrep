const request = require('supertest');
const mongoose = require('mongoose');
const { connectDB, disconnectDB, clearDB } = require('./setup/db');
const { buildTestApp } = require('./setup/testApp');
const { createUser, tokenFor, authHeader } = require('./setup/authHelper');

const leaderboardRoutes = require('../src/routes/leaderboard');
const app = buildTestApp([{ path: '/api/leaderboard', router: leaderboardRoutes }]);

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
afterEach(async () => { await clearDB(); });

describe('Leaderboard Module', () => {
  test('GET /api/leaderboard/students requires authentication', async () => {
    const res = await request(app).get('/api/leaderboard/students');
    expect(res.status).toBe(401);
  });

  test('GET /api/leaderboard/students returns 2xx for authenticated user', async () => {
    const student = await createUser({ role: 'student' });
    const res = await request(app)
      .get('/api/leaderboard/students')
      .set(authHeader(tokenFor(student)));
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
  });

  test('POST /api/leaderboard/:jobId/generate blocks candidates with 403', async () => {
    const student = await createUser({ role: 'student' });
    const fakeJobId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post(`/api/leaderboard/${fakeJobId}/generate`)
      .set(authHeader(tokenFor(student)));
    expect(res.status).toBe(403);
  });

  test('PUT /api/leaderboard/:jobId/candidate/:studentId/status blocks candidates', async () => {
    const student = await createUser({ role: 'student' });
    const res = await request(app)
      .put(`/api/leaderboard/${new mongoose.Types.ObjectId()}/candidate/${new mongoose.Types.ObjectId()}/status`)
      .set(authHeader(tokenFor(student)))
      .send({ status: 'shortlisted' });
    expect(res.status).toBe(403);
  });
});
