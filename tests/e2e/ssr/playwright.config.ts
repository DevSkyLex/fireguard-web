import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/** Repository root for server commands and artifacts. */
const projectRoot = resolve(__dirname, '../../..');

/**
 * Configuration SSR smoke
 * @description Uses the real SSR host and a local HTTPS API reachable from both server and
 * browser. The normal SPA mocks cannot provide server-side interception.
 * @since 1.0.0
 */
export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  reporter: 'line',
  globalTeardown: './global-teardown.ts',
  outputDir: resolve(projectRoot, 'tests/e2e/test-results-ssr'),
  use: {
    baseURL: 'http://127.0.0.1:4274',
    ignoreHTTPSErrors: true,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'ssr-chromium', use: devices['Desktop Chrome'] },
    { name: 'ssr-webkit', use: devices['Desktop Safari'] },
  ],
  webServer: {
    cwd: projectRoot,
    command: 'node tests/e2e/ssr/start-server.cjs',
    url: 'http://127.0.0.1:4274/runtime-config.json',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
