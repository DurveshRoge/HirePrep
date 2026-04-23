const { connectDB, disconnectDB, clearDB } = require('./setup/db');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Job = require('../src/models/Job');
const Candidate = require('../src/models/Candidate');
const Company = require('../src/models/Company');
const Application = require('../src/models/Application');

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
afterEach(async () => { await clearDB(); });

describe('Models Module', () => {
  describe('User model', () => {
    test('hashes password before saving', async () => {
      const user = await User.create({
        name: 'X', email: 'x@example.com', password: 'plaintext1', role: 'student'
      });
      expect(user.password).not.toBe('plaintext1');
      expect(user.password.startsWith('$2')).toBe(true);
    });

    test('comparePassword returns true for correct password', async () => {
      const user = await User.create({
        name: 'X', email: 'y@example.com', password: 'mypass1', role: 'student'
      });
      expect(await user.comparePassword('mypass1')).toBe(true);
      expect(await user.comparePassword('wrongpass')).toBe(false);
    });

    test('toJSON strips password from output', async () => {
      const user = await User.create({
        name: 'X', email: 'z@example.com', password: 'mypass1', role: 'student'
      });
      const json = user.toJSON();
      expect(json.password).toBeUndefined();
      expect(json.email).toBe('z@example.com');
    });

    test('rejects creation without required role', async () => {
      await expect(User.create({
        name: 'X', email: 'nr@example.com', password: 'pass123'
      })).rejects.toThrow();
    });

    test('enforces unique email', async () => {
      await User.create({ name: 'A', email: 'dup@example.com', password: 'pass123', role: 'student' });
      await expect(User.create({
        name: 'B', email: 'dup@example.com', password: 'pass123', role: 'student'
      })).rejects.toThrow();
    });

    test('allows google users without password', async () => {
      const user = await User.create({
        name: 'G', email: 'g@example.com', role: 'student',
        authProvider: 'google', googleId: 'google-abc'
      });
      expect(user.authProvider).toBe('google');
      expect(user.password).toBeUndefined();
    });
  });

  describe('Job model', () => {
    test('requires companyId, title, description, skills', async () => {
      await expect(Job.create({ title: 'Dev' })).rejects.toThrow();
    });

    test('accepts valid job with minimum required fields', async () => {
      const job = await Job.create({
        companyId: new mongoose.Types.ObjectId(),
        title: 'Software Engineer',
        description: 'Build things.',
        requirements: {
          skills: [{ name: 'JavaScript', level: 'Intermediate' }]
        }
      });
      expect(job._id).toBeDefined();
      expect(job.requirements.skills[0].name).toBe('JavaScript');
    });

    test('rejects skill with invalid level enum', async () => {
      await expect(Job.create({
        companyId: new mongoose.Types.ObjectId(),
        title: 'Dev',
        description: 'Desc',
        requirements: { skills: [{ name: 'JS', level: 'Wizard' }] }
      })).rejects.toThrow();
    });
  });

  describe('Candidate model', () => {
    test('requires firstName, lastName, email, userId', async () => {
      await expect(Candidate.create({ firstName: 'A' })).rejects.toThrow();
    });

    test('accepts valid candidate and lowercases email', async () => {
      const c = await Candidate.create({
        userId: new mongoose.Types.ObjectId(),
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'Jane@EXAMPLE.com'
      });
      expect(c.email).toBe('jane@example.com');
    });
  });

  describe('Application model', () => {
    test('requires candidateId, jobId, companyId', async () => {
      await expect(Application.create({})).rejects.toThrow();
    });

    test('enforces unique (candidateId, jobId) pair', async () => {
      const candidateId = new mongoose.Types.ObjectId();
      const jobId = new mongoose.Types.ObjectId();
      const companyId = new mongoose.Types.ObjectId();
      await Application.create({ candidateId, jobId, companyId });
      await expect(Application.create({ candidateId, jobId, companyId })).rejects.toThrow();
    });
  });
});
