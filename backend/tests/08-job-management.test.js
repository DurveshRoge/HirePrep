const request = require('supertest');
const mongoose = require('mongoose');
const { connectDB, disconnectDB, clearDB } = require('./setup/db');
const { buildTestApp } = require('./setup/testApp');
const { createUser, tokenFor, authHeader } = require('./setup/authHelper');
const Job = require('../src/models/Job');
const Company = require('../src/models/Company');

const jobsRoutes = require('../src/routes/jobs');
const app = buildTestApp([{ path: '/api/jobs', router: jobsRoutes }]);

const createCompanyProfile = async (user) => {
  return Company.create({
    userId: user._id,
    companyName: user.profile?.companyName || 'Acme Corp',
    email: user.email,
    industry: 'Tech',
    companySize: '11-50'
  });
};

const seedJob = async (companyUser, overrides = {}) => {
  return Job.create({
    companyId: companyUser._id,
    title: 'Software Engineer',
    description: 'Build useful things.',
    requirements: { skills: [{ name: 'JavaScript', level: 'Intermediate' }] },
    status: 'active',
    postedDate: new Date(),
    postedAt: new Date(),
    ...overrides
  });
};

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
afterEach(async () => { await clearDB(); });

describe('Job Management Module', () => {
  test('GET /api/jobs is publicly accessible (no auth needed)', async () => {
    const res = await request(app).get('/api/jobs');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.jobs)).toBe(true);
  });

  test('GET /api/jobs returns active jobs', async () => {
    const company = await createUser({ role: 'company' });
    await seedJob(company);
    const res = await request(app).get('/api/jobs');
    expect(res.body.data.jobs.length).toBeGreaterThan(0);
  });

  test('GET /api/jobs supports keyword filtering', async () => {
    const company = await createUser({ role: 'company' });
    await seedJob(company, { title: 'Python Engineer' });
    await seedJob(company, { title: 'Frontend Engineer' });
    const res = await request(app).get('/api/jobs?keyword=Python');
    expect(res.status).toBe(200);
    expect(res.body.data.jobs.every((j) => /python/i.test(j.title))).toBe(true);
  });

  test('GET /api/jobs paginates results', async () => {
    const company = await createUser({ role: 'company' });
    for (let i = 0; i < 3; i++) {
      await seedJob(company, { title: `Role ${i}` });
    }
    const res = await request(app).get('/api/jobs?limit=2&page=1');
    expect(res.body.data.jobs.length).toBeLessThanOrEqual(2);
    expect(res.body.data.pagination.total).toBe(3);
  });

  test('GET /api/jobs/:id returns a single job for authenticated user', async () => {
    const company = await createUser({ role: 'company' });
    const job = await seedJob(company);
    const res = await request(app)
      .get(`/api/jobs/${job._id}`)
      .set(authHeader(tokenFor(company)));
    expect(res.status).toBe(200);
  });

  test('POST /api/jobs requires authentication', async () => {
    const res = await request(app).post('/api/jobs').send({ title: 'X', description: 'Y' });
    expect(res.status).toBe(401);
  });

  test('POST /api/jobs rejects candidate role with 403', async () => {
    const student = await createUser({ role: 'student' });
    const res = await request(app)
      .post('/api/jobs')
      .set(authHeader(tokenFor(student)))
      .send({ title: 'X', description: 'Y' });
    expect(res.status).toBe(403);
  });

  test('POST /api/jobs returns 404 when company profile is missing', async () => {
    const company = await createUser({ role: 'company' });
    const res = await request(app)
      .post('/api/jobs')
      .set(authHeader(tokenFor(company)))
      .send({
        title: 'New Role',
        description: 'Great opportunity to grow.',
        requirements: { skills: [{ name: 'Node.js' }] }
      });
    expect(res.status).toBe(404);
  });

  test('POST /api/jobs creates a job when company profile exists', async () => {
    const company = await createUser({ role: 'company' });
    await createCompanyProfile(company);
    const res = await request(app)
      .post('/api/jobs')
      .set(authHeader(tokenFor(company)))
      .send({
        title: 'Senior Engineer',
        description: 'Senior role.',
        requirements: { skills: [{ name: 'Go' }] }
      });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Senior Engineer');
    const stored = await Job.findById(res.body.data._id);
    expect(stored.companyId.toString()).toBe(company._id.toString());
  });

  test('PUT /api/jobs/:id updates a job', async () => {
    const company = await createUser({ role: 'company' });
    const job = await seedJob(company);
    const res = await request(app)
      .put(`/api/jobs/${job._id}`)
      .set(authHeader(tokenFor(company)))
      .send({ title: 'Updated Title' });
    expect(res.status).toBe(200);
  });

  test('DELETE /api/jobs/:id removes a job', async () => {
    const company = await createUser({ role: 'company' });
    const job = await seedJob(company);
    const res = await request(app)
      .delete(`/api/jobs/${job._id}`)
      .set(authHeader(tokenFor(company)));
    expect(res.status).toBe(200);
    const after = await Job.findById(job._id);
    expect(after).toBeNull();
  });

  test('GET /api/jobs/company/my-jobs returns jobs for the company', async () => {
    const company = await createUser({ role: 'company' });
    await seedJob(company);
    const res = await request(app)
      .get('/api/jobs/company/my-jobs')
      .set(authHeader(tokenFor(company)));
    expect(res.status).toBe(200);
  });

  test('GET /api/jobs/company/my-jobs rejects non-company users', async () => {
    const student = await createUser({ role: 'student' });
    const res = await request(app)
      .get('/api/jobs/company/my-jobs')
      .set(authHeader(tokenFor(student)));
    expect(res.status).toBe(403);
  });

  test('PUT /api/jobs/:id/toggle-status activates a paused job', async () => {
    const company = await createUser({ role: 'company' });
    const job = await seedJob(company, { status: 'paused' });
    const res = await request(app)
      .put(`/api/jobs/${job._id}/toggle-status`)
      .set(authHeader(tokenFor(company)));
    expect(res.status).toBe(200);
    const updated = await Job.findById(job._id);
    expect(updated.status).toBe('active');
  });
});
