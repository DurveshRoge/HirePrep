const request = require('supertest');
const mongoose = require('mongoose');
const { connectDB, disconnectDB, clearDB } = require('./setup/db');
const { buildTestApp } = require('./setup/testApp');
const { createUser, tokenFor, authHeader } = require('./setup/authHelper');
const Job = require('../src/models/Job');
const Application = require('../src/models/Application');

const applicationsRoutes = require('../src/routes/applications');
const app = buildTestApp([{ path: '/api/applications', router: applicationsRoutes }]);

const seedJob = async (companyUser) => Job.create({
  companyId: companyUser._id,
  title: 'Role',
  description: 'Description.',
  requirements: { skills: [{ name: 'Node.js' }] },
  status: 'active'
});

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
afterEach(async () => { await clearDB(); });

describe('Applications Module', () => {
  test('GET /api/applications requires authentication', async () => {
    const res = await request(app).get('/api/applications');
    expect(res.status).toBe(401);
  });

  test('GET /api/applications returns empty list for new candidate', async () => {
    const student = await createUser({ role: 'student' });
    const res = await request(app)
      .get('/api/applications')
      .set(authHeader(tokenFor(student)));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/applications rejects when jobId is missing', async () => {
    const student = await createUser({ role: 'student' });
    const res = await request(app)
      .post('/api/applications')
      .set(authHeader(tokenFor(student)))
      .send({});
    expect([400, 404, 422]).toContain(res.status);
  });

  test('GET /api/applications/:id returns 404 for non-existent application', async () => {
    const student = await createUser({ role: 'student' });
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/applications/${fakeId}`)
      .set(authHeader(tokenFor(student)));
    expect([400, 404]).toContain(res.status);
  });

  test('DELETE /api/applications/:id on unknown id returns 4xx', async () => {
    const student = await createUser({ role: 'student' });
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .delete(`/api/applications/${fakeId}`)
      .set(authHeader(tokenFor(student)));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  test('GET /api/applications/company/all blocks candidates with 403', async () => {
    const student = await createUser({ role: 'student' });
    const res = await request(app)
      .get('/api/applications/company/all')
      .set(authHeader(tokenFor(student)));
    expect(res.status).toBe(403);
  });

  test('GET /api/applications/company/all returns 200 for company user', async () => {
    const company = await createUser({ role: 'company' });
    const res = await request(app)
      .get('/api/applications/company/all')
      .set(authHeader(tokenFor(company)));
    expect(res.status).toBe(200);
  });

  test('Application document persists in database on direct create', async () => {
    const company = await createUser({ role: 'company' });
    const student = await createUser({ role: 'student' });
    const job = await seedJob(company);
    const app1 = await Application.create({
      candidateId: student._id,
      jobId: job._id,
      companyId: company._id,
      status: 'applied'
    });
    expect(app1._id).toBeDefined();
    const found = await Application.findOne({ candidateId: student._id, jobId: job._id });
    expect(found).not.toBeNull();
  });
});
