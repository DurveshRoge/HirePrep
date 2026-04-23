import '@testing-library/jest-dom';
import { vi } from 'vitest';

globalThis.__VITE_ENV__ = { DEV: true, VITE_API_URL: 'http://localhost:5000' };

if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
  }
}
