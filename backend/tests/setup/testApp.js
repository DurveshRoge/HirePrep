const express = require('express');

/**
 * Build a minimal Express app for testing routes.
 * Bypasses rate limiters, helmet, CORS etc. so tests focus on business logic.
 */
const buildTestApp = (routeMounts = []) => {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  routeMounts.forEach(({ path, router }) => {
    app.use(path, router);
  });

  const { errorHandler } = require('../../src/middlewares/errorHandler');
  app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));
  app.use(errorHandler);

  return app;
};

module.exports = { buildTestApp };
