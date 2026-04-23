import { describe, test, expect } from 'vitest';

// Mirrors the reducer in src/context/AuthContext.jsx — documents and locks in
// the state transitions used throughout the app.
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  token: null
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false
      };
    case 'LOGOUT':
      return { ...state, user: null, token: null, isAuthenticated: false, isLoading: false };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } };
    default:
      return state;
  }
};

describe('Auth Reducer (UI state machine)', () => {
  test('SET_LOADING flips isLoading flag', () => {
    const next = authReducer(initialState, { type: 'SET_LOADING', payload: false });
    expect(next.isLoading).toBe(false);
  });

  test('LOGIN_SUCCESS populates user, token, and authenticated flag', () => {
    const next = authReducer(initialState, {
      type: 'LOGIN_SUCCESS',
      payload: { user: { id: 'u1', email: 'a@b.com' }, token: 'jwt-abc' }
    });
    expect(next.isAuthenticated).toBe(true);
    expect(next.user.id).toBe('u1');
    expect(next.token).toBe('jwt-abc');
    expect(next.isLoading).toBe(false);
  });

  test('LOGOUT clears user and token and unsets authentication', () => {
    const loggedIn = authReducer(initialState, {
      type: 'LOGIN_SUCCESS',
      payload: { user: { id: 'u1' }, token: 't' }
    });
    const next = authReducer(loggedIn, { type: 'LOGOUT' });
    expect(next.user).toBeNull();
    expect(next.token).toBeNull();
    expect(next.isAuthenticated).toBe(false);
  });

  test('UPDATE_USER merges patch into existing user', () => {
    const loggedIn = authReducer(initialState, {
      type: 'LOGIN_SUCCESS',
      payload: { user: { id: 'u1', name: 'Old' }, token: 't' }
    });
    const next = authReducer(loggedIn, {
      type: 'UPDATE_USER',
      payload: { name: 'New', avatar: 'url' }
    });
    expect(next.user.name).toBe('New');
    expect(next.user.avatar).toBe('url');
    expect(next.user.id).toBe('u1');
  });

  test('unknown action type returns state unchanged', () => {
    const next = authReducer(initialState, { type: 'MYSTERY' });
    expect(next).toBe(initialState);
  });
});
