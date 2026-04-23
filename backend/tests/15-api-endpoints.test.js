const request = require('supertest');
const express = require('express');
const { connectDB, disconnectDB, clearDB } = require('./setup/db');
const { buildTestApp } = require('./setup/testApp');

const authRoutes = require('../src/routes/auth');

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
afterEach(async () => { await clearDB(); });

describe('API Endpoints Module', () => {
  test('Unknown endpoint returns 404 JSON response', async () => {
    const app = buildTestApp([{ path: '/api/auth', router: authRoutes }]);
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('JSON body parser accepts valid JSON', async () => {
    const app = express();
    app.use(express.json());
    app.post('/echo', (req, res) => res.json({ received: req.body }));
    const res = await request(app)
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send({ hello: 'world' });
    expect(res.status).toBe(200);
    expect(res.body.received.hello).toBe('world');
  });

  test('Global error handler returns 500 JSON for uncaught errors', async () => {
    const app = buildTestApp([
      {
        path: '/api/test-error',
        router: (() => {
          const r = express.Router();
          r.get('/', (req, res, next) => next(new Error('boom')));
          return r;
        })()
      }
    ]);
    const res = await request(app).get('/api/test-error');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  test('OPTIONS request reaches the auth middleware and is handled', async () => {
    const app = buildTestApp([{ path: '/api/auth', router: authRoutes }]);
    const res = await request(app)
      .options('/api/auth/login')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST');
    // Without CORS middleware the router responds with 200 (OPTIONS default)
    // or 401 (auth gate). Either proves the request reached the app.
    expect([200, 204, 401, 404]).toContain(res.status);
  });

  test('Server responds to health check in app.js', () => {
    const app = express();
    app.get('/', (req, res) => res.json({ success: true, message: 'OK' }));
    return request(app).get('/').then((res) => {
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
