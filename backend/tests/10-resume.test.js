const request = require('supertest');
const mongoose = require('mongoose');
const { connectDB, disconnectDB, clearDB } = require('./setup/db');
const { buildTestApp } = require('./setup/testApp');
const { createUser, tokenFor, authHeader } = require('./setup/authHelper');
const Resume = require('../src/models/Resume');

const resumeRoutes = require('../src/routes/resume');
const app = buildTestApp([{ path: '/api/resumes', router: resumeRoutes }]);

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
afterEach(async () => { await clearDB(); });

describe('Resume Processing Module', () => {
  test('GET /api/resumes requires authentication', async () => {
    const res = await request(app).get('/api/resumes');
    expect(res.status).toBe(401);
  });

  test('GET /api/resumes blocks company users with 403', async () => {
    const company = await createUser({ role: 'company' });
    const res = await request(app)
      .get('/api/resumes')
      .set(authHeader(tokenFor(company)));
    expect(res.status).toBe(403);
  });

  test('GET /api/resumes returns 200 for student user', async () => {
    const student = await createUser({ role: 'student' });
    const res = await request(app)
      .get('/api/resumes')
      .set(authHeader(tokenFor(student)));
    expect(res.status).toBe(200);
  });

  test('GET /api/resumes/my-resume returns 200/404 for student', async () => {
    const student = await createUser({ role: 'student' });
    const res = await request(app)
      .get('/api/resumes/my-resume')
      .set(authHeader(tokenFor(student)));
    expect([200, 404]).toContain(res.status);
  });

  test('POST /api/resumes/upload rejects non-student roles', async () => {
    const company = await createUser({ role: 'company' });
    const res = await request(app)
      .post('/api/resumes/upload')
      .set(authHeader(tokenFor(company)));
    expect(res.status).toBe(403);
  });

  test('POST /api/resumes/sync-skills requires auth', async () => {
    const res = await request(app).post('/api/resumes/sync-skills');
    expect(res.status).toBe(401);
  });

  test('GET /api/resumes/analyze/job/:jobId requires student role', async () => {
    const company = await createUser({ role: 'company' });
    const fakeJobId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/resumes/analyze/job/${fakeJobId}`)
      .set(authHeader(tokenFor(company)));
    expect(res.status).toBe(403);
  });

  test('GET /api/resumes/analytics/my-resume requires student role', async () => {
    const company = await createUser({ role: 'company' });
    const res = await request(app)
      .get('/api/resumes/analytics/my-resume')
      .set(authHeader(tokenFor(company)));
    expect(res.status).toBe(403);
  });

  test('GET /api/resumes/test endpoint returns authenticated user info', async () => {
    const student = await createUser({ role: 'student' });
    const res = await request(app)
      .get('/api/resumes/test')
      .set(authHeader(tokenFor(student)));
    expect(res.status).toBe(200);
    expect(res.body.userId.toString()).toBe(student._id.toString());
    expect(res.body.userRole).toBe('student');
  });

  test('Resume model accepts and persists a resume document', async () => {
    const student = await createUser({ role: 'student' });
    const resume = await Resume.create({
      userId: student._id,
      originalFileName: 'resume.pdf',
      fileType: 'pdf',
      fileUrl: 'https://example.com/resume.pdf',
      extractedText: 'Experienced software engineer.'
    });
    expect(resume._id).toBeDefined();
    const found = await Resume.findOne({ userId: student._id });
    expect(found).not.toBeNull();
  });
});
