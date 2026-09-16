import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { visualRun } from '../../support/helpers/visual-run';

const root = resolve(__dirname, '../../..');
const locale = process.env['FG_E2E_LOCALE'];
if (locale !== 'fr' && locale !== 'es') throw new Error('FG_E2E_LOCALE must be fr or es.');
const port = locale === 'fr' ? 4276 : 4277;
const run = visualRun();

/**
 * Configuration localizedShell
 * @description Serves one real translated bundle at a time with existing locale and SSR-off E2E
 * build configurations. Its dedicated scope is excluded from both the standard and isolated harness.
 * @since 1.0.0
 */
export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  forbidOnly: true,
  retries: 0,
  workers: 1,
  outputDir: resolve(root, 'e2e', `test-results-${run.name}-${locale}`),
  reporter: [
    ['line'],
    ['json', { outputFile: resolve(run.directory, 'locales', locale, 'results.json') }],
  ],
  projects: [
    {
      name: `${locale}-mobile-chromium`,
      metadata: { locale },
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 390, height: 844 },
        baseURL: `http://localhost:${port}/`,
        serviceWorkers: 'block',
        colorScheme: 'light',
        screenshot: 'only-on-failure',
      },
    },
  ],
  webServer: {
    command: `node node_modules/@angular/cli/bin/ng.js serve --configuration=${locale} --build-target=fireguard-web:build:e2e,${locale} --port=${port}`,
    cwd: root,
    url: `http://localhost:${port}/`,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
