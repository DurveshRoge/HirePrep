jest.mock('google-auth-library');

const request = require('supertest');
const { connectDB, disconnectDB, clearDB } = require('./setup/db');
const { buildTestApp } = require('./setup/testApp');

const authRoutes = require('../src/routes/auth');
const app = buildTestApp([{ path: '/api/auth', router: authRoutes }]);

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
afterEach(async () => { await clearDB(); });

describe('Third-Party Integrations Module', () => {
  test('Google OAuth: SDK is mocked and returns a ticket payload', async () => {
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({ idToken: 'any-token', audience: ['aud'] });
    const payload = ticket.getPayload();
    expect(payload.email).toBeDefined();
    expect(payload.email_verified).toBe(true);
  });

  test('Google OAuth: invalid token path throws as expected', async () => {
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client();
    await expect(client.verifyIdToken({ idToken: 'invalid-token', audience: ['aud'] }))
      .rejects.toThrow();
  });

  test('Google OAuth integration: signup endpoint succeeds with mocked token', async () => {
    const res = await request(app).post('/api/auth/google').send({
      idToken: 'integration-test-token',
      role: 'student',
      mode: 'signup'
    });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  test('OpenAI/Groq client loads without throwing in test env', () => {
    expect(() => require('../src/config/openai')).not.toThrow();
  });

  test('AWS SDK S3 client can be instantiated with test credentials', () => {
    const { S3Client } = require('@aws-sdk/client-s3');
    const client = new S3Client({ region: 'us-east-1' });
    expect(client).toBeDefined();
    expect(typeof client.send).toBe('function');
  });

  test('Gemini SDK can be required without error', () => {
    expect(() => require('@google/generative-ai')).not.toThrow();
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const gen = new GoogleGenerativeAI('test-api-key');
    expect(gen).toBeDefined();
  });
});
