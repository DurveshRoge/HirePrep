const express = require('express');
const request = require('supertest');
const { errorHandler, notFound, asyncHandler } = require('../src/middlewares/errorHandler');

const buildErrApp = (triggeringRoute) => {
  const app = express();
  app.use(express.json());
  app.get('/boom', triggeringRoute);
  app.use(errorHandler);
  return app;
};

describe('Error Handling Module', () => {
  test('Mongoose ValidationError returns 400 with combined messages', async () => {
    const app = buildErrApp((req, res, next) => {
      const err = new Error('x');
      err.name = 'ValidationError';
      err.errors = { field: { message: 'Field is required' } };
      next(err);
    });
    const res = await request(app).get('/boom');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Validation Error/);
  });

  test('MongoDB duplicate key error returns 400', async () => {
    const app = buildErrApp((req, res, next) => {
      const err = new Error('dup');
      err.code = 11000;
      err.keyValue = { email: 'a@b.com' };
      next(err);
    });
    const res = await request(app).get('/boom');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email already exists/);
  });

  test('CastError returns 400 "Invalid ID format"', async () => {
    const app = buildErrApp((req, res, next) => {
      const err = new Error('cast');
      err.name = 'CastError';
      next(err);
    });
    const res = await request(app).get('/boom');
    expect(res.status).toBe(400);
  });

  test('JsonWebTokenError maps to 401', async () => {
    const app = buildErrApp((req, res, next) => {
      const err = new Error('jwt');
      err.name = 'JsonWebTokenError';
      next(err);
    });
    const res = await request(app).get('/boom');
    expect(res.status).toBe(401);
  });

  test('Multer LIMIT_FILE_SIZE returns 400', async () => {
    const app = buildErrApp((req, res, next) => {
      const err = new Error('size');
      err.code = 'LIMIT_FILE_SIZE';
      next(err);
    });
    const res = await request(app).get('/boom');
    expect(res.status).toBe(400);
  });

  test('entity.too.large maps to 413', async () => {
    const app = buildErrApp((req, res, next) => {
      const err = new Error('too large');
      err.type = 'entity.too.large';
      next(err);
    });
    const res = await request(app).get('/boom');
    expect(res.status).toBe(413);
  });

  test('asyncHandler forwards rejected promises to error handler', async () => {
    const app = express();
    app.get('/boom', asyncHandler(async () => {
      throw new Error('boom');
    }));
    app.use(errorHandler);
    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
  });
});
