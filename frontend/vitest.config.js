import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
    reporters: ['default', ['html', { outputFile: './test-report/frontend-report.html' }]],
    coverage: { enabled: false }
  }
});
