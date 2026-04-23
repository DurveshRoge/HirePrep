const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { connectDB, disconnectDB, clearDB } = require('./setup/db');
const { createUser, tokenFor, authHeader } = require('./setup/authHelper');
const { authenticate, authorize, optionalAuth } = require('../src/middlewares/authMiddleware');
const { errorHandler } = require('../src/middlewares/errorHandler');

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
afterEach(async () => { await clearDB(); });

const buildMiniApp = (handlerChain) => {
  const app = express();
  app.use(express.json());
  app.get('/protected', ...handlerChain);
  app.use(errorHandler);
  return app;
};

describe('Security & Middleware Module', () => {
  test('authenticate middleware rejects requests without a token', async () => {
    const app = buildMiniApp([authenticate, (req, res) => res.json({ ok: true })]);
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('authenticate middleware rejects invalid token strings', async () => {
    const app = buildMiniApp([authenticate, (req, res) => res.json({ ok: true })]);
    const res = await request(app).get('/protected').set('Authorization', 'Bearer garbage.token.value');
    expect(res.status).toBe(401);
  });

  test('authenticate middleware rejects tokens for deleted users', async () => {
    const user = await createUser();
    const token = tokenFor(user);
    const User = require('../src/models/User');
    await User.deleteOne({ _id: user._id });
    const app = buildMiniApp([authenticate, (req, res) => res.json({ ok: true })]);
    const res = await request(app).get('/protected').set(authHeader(token));
    expect(res.status).toBe(401);
  });

  test('authenticate middleware rejects tokens signed with wrong secret', async () => {
    const bogus = jwt.sign(
      { id: 'user123', role: 'student' },
      'wrong-secret',
      { algorithm: 'HS256', issuer: 'hireprep-api', audience: 'hireprep-client', expiresIn: '1h' }
    );
    const app = buildMiniApp([authenticate, (req, res) => res.json({ ok: true })]);
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${bogus}`);
    expect(res.status).toBe(401);
  });

  test('authenticate middleware rejects expired tokens', async () => {
    const expired = jwt.sign(
      { id: 'user123', role: 'student' },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', issuer: 'hireprep-api', audience: 'hireprep-client', expiresIn: '-1s' }
    );
    const app = buildMiniApp([authenticate, (req, res) => res.json({ ok: true })]);
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  test('authorize middleware blocks users without required role', async () => {
    const user = await createUser({ role: 'student' });
    const app = buildMiniApp([authenticate, authorize('company'), (req, res) => res.json({ ok: true })]);
    const res = await request(app).get('/protected').set(authHeader(tokenFor(user)));
    expect(res.status).toBe(403);
  });

  test('authorize middleware allows users with matching role', async () => {
    const user = await createUser({ role: 'company' });
    const app = buildMiniApp([authenticate, authorize('company'), (req, res) => res.json({ ok: true })]);
    const res = await request(app).get('/protected').set(authHeader(tokenFor(user)));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('authorize middleware rejects anonymous requests with 401', async () => {
    const app = express();
    app.use(express.json());
    app.get('/protected', authorize('student'), (req, res) => res.json({ ok: true }));
    app.use(errorHandler);
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
  });

  test('optionalAuth middleware attaches user when valid token present', async () => {
    const user = await createUser();
    const app = express();
    app.use(express.json());
    app.get('/open', optionalAuth, (req, res) => res.json({ hasUser: !!req.user, email: req.user?.email }));
    const res = await request(app).get('/open').set(authHeader(tokenFor(user)));
    expect(res.body.hasUser).toBe(true);
    expect(res.body.email).toBe(user.email);
  });

  test('optionalAuth middleware continues gracefully when token is invalid', async () => {
    const app = express();
    app.use(express.json());
    app.get('/open', optionalAuth, (req, res) => res.json({ hasUser: !!req.user }));
    const res = await request(app).get('/open').set('Authorization', 'Bearer broken.token');
    expect(res.status).toBe(200);
    expect(res.body.hasUser).toBe(false);
  });
});
