const User = require('../../src/models/User');
const { generateToken, generateRefreshToken } = require('../../src/utils/jwt');

const createUser = async (overrides = {}) => {
  const defaults = {
    name: 'Test User',
    email: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
    password: 'Password123',
    role: 'student'
  };
  const data = { ...defaults, ...overrides };
  const user = new User(data);
  await user.save();
  return user;
};

const tokenFor = (user) => generateToken({ id: user._id, role: user.role });
const refreshTokenFor = (user) => generateRefreshToken({ id: user._id, role: user.role });

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { createUser, tokenFor, refreshTokenFor, authHeader };
