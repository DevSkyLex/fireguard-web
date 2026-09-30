import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('../..', import.meta.url)),
  test: {
    name: 'contracts',
    environment: 'node',
    include: ['tests/contracts/**/*.spec.ts'],
    allowOnly: !process.env['CI'],
    passWithNoTests: false,
    testTimeout: 30000,
  },
});
