import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/** Live integration owns an isolated stack supplied by CI; it launches no mock server. */
export default defineConfig({
  testDir: '.',
  testMatch: 'live-api.spec.ts',
  globalSetup: './global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: [['line'], ['junit', { outputFile: 'test-results-live-api/results.xml' }]],
  outputDir: resolve(__dirname, '../../../test-results-live-api'),
  use: {
    baseURL: process.env['FG_LIVE_WEB_URL'],
    serviceWorkers: 'block',
    // Authentication responses contain credentials; retain only the sanitized ledger in the spec.
    trace: 'off',
    video: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'live-api-chromium', use: devices['Desktop Chrome'] }],
});
