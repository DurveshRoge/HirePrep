import { describe, test, expect } from 'vitest';
import { resolveMediaUrl } from '../utils/mediaUrl';

describe('resolveMediaUrl', () => {
  test('returns empty string for falsy or non-string input', () => {
    expect(resolveMediaUrl('')).toBe('');
    expect(resolveMediaUrl(null)).toBe('');
    expect(resolveMediaUrl(undefined)).toBe('');
    expect(resolveMediaUrl(42)).toBe('');
  });

  test('returns absolute URLs untouched when protocol matches', () => {
    expect(resolveMediaUrl('https://example.com/img.png')).toBe('https://example.com/img.png');
  });

  test('returns bare path unchanged when not a /uploads path', () => {
    expect(resolveMediaUrl('assets/logo.svg')).toBe('assets/logo.svg');
  });
});
