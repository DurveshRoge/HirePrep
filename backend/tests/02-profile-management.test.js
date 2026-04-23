const request = require('supertest');
const { connectDB, disconnectDB, clearDB } = require('./setup/db');
const { buildTestApp } = require('./setup/testApp');
const { createUser, tokenFor, authHeader } = require('./setup/authHelper');

const candidatesRoutes = require('../src/routes/candidates');
const companiesRoutes = require('../src/routes/companies');
const authRoutes = require('../src/routes/auth');

const app = buildTestApp([
  { path: '/api/candidates', router: candidatesRoutes },
  { path: '/api/companies', router: companiesRoutes },
  { path: '/api/auth', router: authRoutes }
]);

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
afterEach(async () => { await clearDB(); });

describe('Profile Management Module', () => {
  test('GET /api/candidates/profile auto-creates candidate profile on first access', async () => {
    const user = await createUser({ name: 'John Doe', role: 'student' });
    const res = await request(app)
      .get('/api/candidates/profile')
      .set(authHeader(tokenFor(user)));
    expect(res.status).toBe(200);
    expect(res.body.data.firstName).toBe('John');
    expect(res.body.data.email).toBe(user.email);
  });

  test('GET /api/candidates/profile rejects company users with 403', async () => {
    const user = await createUser({ role: 'company' });
    const res = await request(app)
      .get('/api/candidates/profile')
      .set(authHeader(tokenFor(user)));
    expect(res.status).toBe(403);
  });

  test('GET /api/candidates/profile requires authentication', async () => {
    const res = await request(app).get('/api/candidates/profile');
    expect(res.status).toBe(401);
  });

  test('GET /api/companies/profile auto-creates company profile on first access', async () => {
    const user = await createUser({
      role: 'company',
      name: 'Acme Corp',
      profile: { companyName: 'Acme Corp', industry: 'Tech', companySize: '11-50' }
    });
    const res = await request(app)
      .get('/api/companies/profile')
      .set(authHeader(tokenFor(user)));
    expect(res.status).toBe(200);
    expect(res.body.data.companyName).toBe('Acme Corp');
  });

  test('GET /api/companies/profile requires authentication', async () => {
    const res = await request(app).get('/api/companies/profile');
    expect(res.status).toBe(401);
  });

  test('PUT /api/auth/profile updates user name', async () => {
    const user = await createUser({ name: 'Original Name' });
    const res = await request(app)
      .put('/api/auth/profile')
      .set(authHeader(tokenFor(user)))
      .send({ name: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Updated Name');
  });
});
