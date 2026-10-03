import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/** Repository root for server commands and artifacts. */
const projectRoot = resolve(__dirname, '../../..');
const locale = process.env['E2E_LOCALE'] ?? 'fr';
if (locale !== 'fr' && locale !== 'es') throw new Error('E2E_LOCALE must be fr or es.');
const language = locale === 'fr' ? 'French' : 'Spanish';

/** Real French and Spanish translations over the hermetic CSR build and API fixtures. */
export default defineConfig({
  testDir: '.',
  testMatch: locale === 'es' ? 'locale-smoke.spec.ts' : '*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  workers: 2,
  reporter: 'line',
  outputDir: resolve(projectRoot, 'tests/e2e/test-results-workload-localized'),
  use: {
    baseURL: 'http://localhost:4274',
    locale: locale === 'fr' ? 'fr-FR' : 'es-ES',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: language + ' desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    { name: language + ' touch', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    cwd: projectRoot,
    command:
      'npx ng serve --build-target=fireguard-web:build:e2e,' +
      locale +
      ' --port=4274 --serve-path=/',
    url: 'http://localhost:4274/main.js',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
