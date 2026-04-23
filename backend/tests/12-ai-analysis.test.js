jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(async () => ({ data: { status: 'ok' } })),
    post: jest.fn(async () => ({ data: { success: true } }))
  },
  get: jest.fn(async () => ({ data: { status: 'ok' } })),
  post: jest.fn(async () => ({ data: { success: true } }))
}));

const request = require('supertest');
const mongoose = require('mongoose');
const { connectDB, disconnectDB, clearDB } = require('./setup/db');
const { buildTestApp } = require('./setup/testApp');
const { createUser, tokenFor, authHeader } = require('./setup/authHelper');

const analysisRoutes = require('../src/routes/analysis');
const app = buildTestApp([{ path: '/api/analysis', router: analysisRoutes }]);

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
afterEach(async () => { await clearDB(); });

describe('AI Analysis Module', () => {
  test('POST /api/analysis/video-frame requires authentication', async () => {
    const res = await request(app).post('/api/analysis/video-frame').send({});
    expect(res.status).toBe(401);
  });

  test('POST /api/analysis/video-frame blocks non-student', async () => {
    const company = await createUser({ role: 'company' });
    const res = await request(app)
      .post('/api/analysis/video-frame')
      .set(authHeader(tokenFor(company)))
      .send({});
    expect(res.status).toBe(403);
  });

  test('POST /api/analysis/video-frame returns 400 when required fields missing', async () => {
    const student = await createUser({ role: 'student' });
    const res = await request(app)
      .post('/api/analysis/video-frame')
      .set(authHeader(tokenFor(student)))
      .send({});
    expect(res.status).toBe(400);
  });

  test('POST /api/analysis/audio returns 400 when audioBase64 missing', async () => {
    const student = await createUser({ role: 'student' });
    const res = await request(app)
      .post('/api/analysis/audio')
      .set(authHeader(tokenFor(student)))
      .send({});
    expect(res.status).toBe(400);
  });

  test('POST /api/analysis/interview-answer returns 404 for non-existent interview', async () => {
    const student = await createUser({ role: 'student' });
    const res = await request(app)
      .post('/api/analysis/interview-answer')
      .set(authHeader(tokenFor(student)))
      .send({
        interviewId: new mongoose.Types.ObjectId().toHexString(),
        questionId: 'q1',
        transcript: 'test'
      });
    expect(res.status).toBe(404);
  });

  test('POST /api/analysis/finalize-interview/:id requires student role', async () => {
    const company = await createUser({ role: 'company' });
    const res = await request(app)
      .post(`/api/analysis/finalize-interview/${new mongoose.Types.ObjectId()}`)
      .set(authHeader(tokenFor(company)));
    expect(res.status).toBe(403);
  });

  test('GET /api/analysis/my-rank/:jobId requires student role', async () => {
    const company = await createUser({ role: 'company' });
    const res = await request(app)
      .get(`/api/analysis/my-rank/${new mongoose.Types.ObjectId()}`)
      .set(authHeader(tokenFor(company)));
    expect(res.status).toBe(403);
  });

  test('GET /api/analysis/health is publicly accessible', async () => {
    const res = await request(app).get('/api/analysis/health');
    expect(res.status).toBe(200);
    expect(res.body.services).toBeDefined();
  });
});
