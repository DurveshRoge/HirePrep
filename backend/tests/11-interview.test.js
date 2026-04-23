const request = require('supertest');
const mongoose = require('mongoose');
const { connectDB, disconnectDB, clearDB } = require('./setup/db');
const { buildTestApp } = require('./setup/testApp');
const { createUser, tokenFor, authHeader } = require('./setup/authHelper');
const Interview = require('../src/models/Interview');

const interviewRoutes = require('../src/routes/interview');
const app = buildTestApp([{ path: '/api/interview', router: interviewRoutes }]);

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
afterEach(async () => { await clearDB(); });

describe('Interview Flow Module', () => {
  test('POST /api/interview/start requires authentication', async () => {
    const res = await request(app).post('/api/interview/start').send({
      jobId: new mongoose.Types.ObjectId().toHexString()
    });
    expect(res.status).toBe(401);
  });

  test('POST /api/interview/start blocks company users with 403', async () => {
    const company = await createUser({ role: 'company' });
    const res = await request(app)
      .post('/api/interview/start')
      .set(authHeader(tokenFor(company)))
      .send({ jobId: new mongoose.Types.ObjectId().toHexString() });
    expect(res.status).toBe(403);
  });

  test('POST /api/interview/start fails validation when jobId missing', async () => {
    const student = await createUser({ role: 'student' });
    const res = await request(app)
      .post('/api/interview/start')
      .set(authHeader(tokenFor(student)))
      .send({});
    expect(res.status).toBe(400);
  });

  test('POST /api/interview/start rejects non-hex jobId', async () => {
    const student = await createUser({ role: 'student' });
    const res = await request(app)
      .post('/api/interview/start')
      .set(authHeader(tokenFor(student)))
      .send({ jobId: 'not-a-hex-id' });
    expect(res.status).toBe(400);
  });

  test('POST /api/interview/start rejects invalid interview type', async () => {
    const student = await createUser({ role: 'student' });
    const res = await request(app)
      .post('/api/interview/start')
      .set(authHeader(tokenFor(student)))
      .send({
        jobId: new mongoose.Types.ObjectId().toHexString(),
        type: 'unsupported-type'
      });
    expect(res.status).toBe(400);
  });

  test('GET /api/interview/:id requires authentication', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/interview/${fakeId}`);
    expect(res.status).toBe(401);
  });

  test('POST /api/interview/:id/submit-answer requires student role', async () => {
    const company = await createUser({ role: 'company' });
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post(`/api/interview/${fakeId}/submit-answer`)
      .set(authHeader(tokenFor(company)));
    expect(res.status).toBe(403);
  });

  test('POST /api/interview/:id/finish blocks company role', async () => {
    const company = await createUser({ role: 'company' });
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post(`/api/interview/${fakeId}/finish`)
      .set(authHeader(tokenFor(company)));
    expect(res.status).toBe(403);
  });

  test('POST /api/interview/:id/cancel blocks company role', async () => {
    const company = await createUser({ role: 'company' });
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post(`/api/interview/${fakeId}/cancel`)
      .set(authHeader(tokenFor(company)));
    expect(res.status).toBe(403);
  });

  test('GET /api/interview/history/my-interviews requires student role', async () => {
    const company = await createUser({ role: 'company' });
    const res = await request(app)
      .get('/api/interview/history/my-interviews')
      .set(authHeader(tokenFor(company)));
    expect(res.status).toBe(403);
  });

  test('GET /api/interview/history/my-interviews returns 200 for student', async () => {
    const student = await createUser({ role: 'student' });
    const res = await request(app)
      .get('/api/interview/history/my-interviews')
      .set(authHeader(tokenFor(student)));
    expect(res.status).toBe(200);
  });

  test('Interview model persists a mock interview document', async () => {
    const student = await createUser({ role: 'student' });
    const jobId = new mongoose.Types.ObjectId();
    const interview = await Interview.create({
      studentId: student._id,
      jobId,
      type: 'mock',
      status: 'in-progress',
      duration: 30
    });
    expect(interview._id).toBeDefined();
    expect(interview.type).toBe('mock');
  });
});
