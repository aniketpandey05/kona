import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Core modules reach for WXT's runtime; the same stand-in the offline harness
  // uses lets them be tested without a browser extension around them.
  resolve: {
    alias: { '#imports': fileURLToPath(new URL('./tests/support/imports-mock.ts', import.meta.url)) },
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
  },
});
