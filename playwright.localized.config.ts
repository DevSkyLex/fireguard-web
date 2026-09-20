import { defineConfig, devices } from '@playwright/test';

/** Real French translations over the same hermetic CSR build and API fixtures. */
export default defineConfig({
  testDir: './e2e/localized',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  workers: 2,
  reporter: 'line',
  outputDir: 'e2e/test-results-workload-localized',
  use: {
    baseURL: 'http://localhost:4274',
    locale: 'fr-FR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'French desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    { name: 'French touch', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npx ng serve --build-target=fireguard-web:build:e2e,fr --port=4274 --serve-path=/',
    url: 'http://localhost:4274/main.js',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
