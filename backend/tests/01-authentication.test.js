jest.mock('google-auth-library');

const request = require('supertest');
const { connectDB, disconnectDB, clearDB } = require('./setup/db');
const { buildTestApp } = require('./setup/testApp');
const { createUser, tokenFor, refreshTokenFor, authHeader } = require('./setup/authHelper');
const User = require('../src/models/User');
const { generateToken, verifyToken, generateRefreshToken, verifyRefreshToken } = require('../src/utils/jwt');

const authRoutes = require('../src/routes/auth');
const app = buildTestApp([{ path: '/api/auth', router: authRoutes }]);

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
afterEach(async () => { await clearDB(); });

describe('Authentication Module', () => {
  describe('JWT utilities', () => {
    test('generateToken creates a verifiable access token with correct claims', () => {
      const token = generateToken({ id: 'user123', role: 'student' });
      const decoded = verifyToken(token);
      expect(decoded.id).toBe('user123');
      expect(decoded.role).toBe('student');
      expect(decoded.iss).toBe('hireprep-api');
      expect(decoded.aud).toBe('hireprep-client');
      expect(decoded.jti).toBeDefined();
    });

    test('verifyToken rejects tampered tokens', () => {
      const token = generateToken({ id: 'x', role: 'student' });
      const tampered = token.slice(0, -4) + 'AAAA';
      expect(() => verifyToken(tampered)).toThrow('Invalid token');
    });

    test('generateRefreshToken and verifyRefreshToken round-trip correctly', () => {
      const rt = generateRefreshToken({ id: 'user123', role: 'company' });
      const decoded = verifyRefreshToken(rt);
      expect(decoded.id).toBe('user123');
      expect(decoded.type).toBe('refresh');
    });
  });

  describe('POST /api/auth/register', () => {
    test('registers a new student with name + email + password', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'secret123',
        role: 'student'
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('alice@example.com');
      expect(res.body.data.user.role).toBe('candidate');
    });

    test('registers a company user', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Acme HR',
        email: 'hr@acme.com',
        password: 'secret123',
        role: 'company'
      });
      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('employer');
    });

    test('rejects duplicate email registration', async () => {
      await createUser({ email: 'dup@example.com' });
      const res = await request(app).post('/api/auth/register').send({
        name: 'Dup',
        email: 'dup@example.com',
        password: 'secret123',
        role: 'student'
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('rejects registration with invalid email format', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Bad',
        email: 'not-an-email',
        password: 'secret123',
        role: 'student'
      });
      expect(res.status).toBe(400);
    });

    test('rejects registration with password under 6 chars', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Short',
        email: 'short@example.com',
        password: '123',
        role: 'student'
      });
      expect(res.status).toBe(400);
    });

    test('supports firstName/lastName alternative name format', async () => {
      const res = await request(app).post('/api/auth/register').send({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'secret123',
        role: 'candidate'
      });
      expect(res.status).toBe(201);
      expect(res.body.data.user.name).toBe('Jane Doe');
    });
  });

  describe('POST /api/auth/login', () => {
    test('logs in with correct credentials', async () => {
      await createUser({ email: 'login@example.com', password: 'secret123', role: 'student' });
      const res = await request(app).post('/api/auth/login').send({
        email: 'login@example.com',
        password: 'secret123'
      });
      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    test('rejects login with wrong password', async () => {
      await createUser({ email: 'login2@example.com', password: 'secret123', role: 'student' });
      const res = await request(app).post('/api/auth/login').send({
        email: 'login2@example.com',
        password: 'wrong-pass'
      });
      expect(res.status).toBe(401);
    });

    test('rejects login with unknown email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'ghost@example.com',
        password: 'whatever'
      });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/google', () => {
    test('signup mode creates new user from Google token', async () => {
      const res = await request(app).post('/api/auth/google').send({
        idToken: 'fresh-google-token',
        role: 'candidate',
        mode: 'signup'
      });
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('googleuser@example.com');
      expect(res.body.data.token).toBeDefined();
    });

    test('rejects invalid Google ID token', async () => {
      const res = await request(app).post('/api/auth/google').send({
        idToken: 'invalid-token',
        mode: 'login'
      });
      expect(res.status).toBe(401);
    });

    test('rejects Google token with unverified email', async () => {
      const res = await request(app).post('/api/auth/google').send({
        idToken: 'unverified-email-token',
        mode: 'signup'
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    test('issues a new access token for a valid refresh token', async () => {
      const user = await createUser();
      const rt = refreshTokenFor(user);
      const res = await request(app).post('/api/auth/refresh-token').send({ refreshToken: rt });
      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
    });

    test('rejects refresh without token', async () => {
      const res = await request(app).post('/api/auth/refresh-token').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/profile (protected)', () => {
    test('returns profile for authenticated user', async () => {
      const user = await createUser({ name: 'Profiled', email: 'p@example.com' });
      const res = await request(app)
        .get('/api/auth/profile')
        .set(authHeader(tokenFor(user)));
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('p@example.com');
    });
  });

  describe('POST /api/auth/logout', () => {
    test('responds OK for authenticated user', async () => {
      const user = await createUser();
      const res = await request(app)
        .post('/api/auth/logout')
        .set(authHeader(tokenFor(user)));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
