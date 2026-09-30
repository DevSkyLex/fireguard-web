import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('../..', import.meta.url)),
  test: {
    name: 'architecture',
    environment: 'node',
    include: ['tests/architecture/**/*.spec.ts'],
    allowOnly: !process.env['CI'],
    passWithNoTests: false,
    testTimeout: 30_000,
  },
});
