const express = require('express');
const request = require('supertest');
const {
  validate,
  registerValidation,
  loginValidation,
  googleAuthValidation,
  updateProfileValidation,
  changePasswordValidation,
  jobValidation,
  interviewStartValidation,
  paginationValidation
} = require('../src/middlewares/validation');

const buildValidatorApp = (schema) => {
  const app = express();
  app.use(express.json());
  app.post('/v', validate(schema), (req, res) => res.json({ ok: true, data: req.validated }));
  return app;
};

describe('Validation Module', () => {
  test('registerValidation accepts complete student payload', async () => {
    const app = buildValidatorApp(registerValidation);
    const res = await request(app).post('/v').send({
      name: 'Alice Smith',
      email: 'alice@example.com',
      password: 'securepass',
      role: 'student'
    });
    expect(res.status).toBe(200);
  });

  test('registerValidation rejects when email missing', async () => {
    const app = buildValidatorApp(registerValidation);
    const res = await request(app).post('/v').send({
      name: 'Alice',
      password: 'securepass',
      role: 'student'
    });
    expect(res.status).toBe(400);
    expect(res.body.data.errors.some((e) => e.field === 'email')).toBe(true);
  });

  test('registerValidation rejects unsupported role', async () => {
    const app = buildValidatorApp(registerValidation);
    const res = await request(app).post('/v').send({
      name: 'Alice',
      email: 'a@b.com',
      password: 'securepass',
      role: 'admin'
    });
    expect(res.status).toBe(400);
  });

  test('loginValidation requires email and password', async () => {
    const app = buildValidatorApp(loginValidation);
    const res = await request(app).post('/v').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  test('loginValidation accepts valid credentials payload', async () => {
    const app = buildValidatorApp(loginValidation);
    const res = await request(app).post('/v').send({ email: 'a@b.com', password: 'anything' });
    expect(res.status).toBe(200);
  });

  test('googleAuthValidation requires idToken and mode', async () => {
    const app = buildValidatorApp(googleAuthValidation);
    const res = await request(app).post('/v').send({ idToken: 't' });
    expect(res.status).toBe(400);
  });

  test('googleAuthValidation rejects unknown mode', async () => {
    const app = buildValidatorApp(googleAuthValidation);
    const res = await request(app).post('/v').send({ idToken: 't', mode: 'magic' });
    expect(res.status).toBe(400);
  });

  test('updateProfileValidation requires at least one field', async () => {
    const app = buildValidatorApp(updateProfileValidation);
    const res = await request(app).post('/v').send({});
    expect(res.status).toBe(400);
  });

  test('changePasswordValidation schema is exported and describable', () => {
    expect(changePasswordValidation).toBeDefined();
    const described = changePasswordValidation.describe();
    expect(described.type).toBe('object');
    expect(Object.keys(described.keys)).toEqual(
      expect.arrayContaining(['currentPassword', 'newPassword', 'confirmPassword'])
    );
  });

  test('jobValidation rejects job without required fields', async () => {
    const app = buildValidatorApp(jobValidation);
    const res = await request(app).post('/v').send({ title: 'Dev' });
    expect(res.status).toBe(400);
  });

  test('interviewStartValidation requires 24-char hex jobId', async () => {
    const app = buildValidatorApp(interviewStartValidation);
    const res = await request(app).post('/v').send({ jobId: 'short-id', type: 'mock' });
    expect(res.status).toBe(400);
  });

  test('paginationValidation applies defaults when empty', async () => {
    const app = buildValidatorApp(paginationValidation);
    const res = await request(app).post('/v').send({});
    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.limit).toBe(10);
  });
});
