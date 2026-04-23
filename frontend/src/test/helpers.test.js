import { describe, test, expect } from 'vitest';
import {
  cn,
  capitalize,
  generateId,
  validateEmail,
  formatPhoneNumber,
  truncateText
} from '../utils/helpers';

describe('Frontend Helpers', () => {
  test('cn joins truthy class names and skips falsy', () => {
    expect(cn('a', false, 'b', null, 'c', undefined)).toBe('a b c');
  });

  test('capitalize handles empty, single, and mixed-case strings', () => {
    expect(capitalize('')).toBe('');
    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('HELLO')).toBe('Hello');
  });

  test('generateId returns a string with expected length', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  test('validateEmail recognizes valid and invalid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('not-an-email')).toBe(false);
    expect(validateEmail('a@b')).toBe(false);
  });

  test('formatPhoneNumber formats 10 digits into US format', () => {
    expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
  });

  test('formatPhoneNumber returns original when not 10 digits', () => {
    expect(formatPhoneNumber('12345')).toBe('12345');
  });

  test('truncateText adds ellipsis when text exceeds limit', () => {
    expect(truncateText('hi', 10)).toBe('hi');
    expect(truncateText('hello world', 5)).toBe('hello...');
  });
});
