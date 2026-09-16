import { isAbsolute, resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const jsonOutput = process.env['PLAYWRIGHT_JSON_OUTPUT_NAME'];
if (jsonOutput && !isAbsolute(jsonOutput))
  process.env['PLAYWRIGHT_JSON_OUTPUT_NAME'] = resolve(__dirname, '../..', jsonOutput);

/**
 * Configuration harness
 * @description Exercises browser probes and harness logic without serving or loading Angular.
 * @since 1.0.0
 */
export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  testIgnore: '**/locales/**',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 2,
  reporter: 'line',
  outputDir: '../test-results-harness',
  use: { serviceWorkers: 'block' },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'webkit', use: devices['Desktop Safari'] },
  ],
});
