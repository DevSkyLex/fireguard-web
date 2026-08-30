import { defineConfig, devices } from '@playwright/test';

/**
 * Port for the `e2e` build/serve configuration (`angular.json`), a
 * client-side-only (no SSR) build of the app. Tests intercept every backend
 * call at the network layer (`e2e/support/mocks/api-mock.ts`); running
 * without SSR guarantees Playwright's `page.route` — which only reaches the
 * browser — sees every request the app makes, instead of missing the ones
 * a Node SSR render would issue server-side.
 */
const E2E_PORT = 4273;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env['CI'],
  /* Retry on CI only */
  retries: process.env['CI'] ? 2 : 0,
  /*
   * Opt out of parallel tests on CI. Locally, cap workers instead of letting
   * Playwright auto-detect from CPU count: this project's single dev-server
   * instance (a Vite-based `ng serve`) becomes the bottleneck under heavy
   * concurrency, not the CPU — 16+ workers produced sporadic timeouts on
   * fully static pages with zero network mocking, while 8 ran the full
   * three-browser suite green repeatedly.
   */
  workers: process.env['CI'] ? 1 : 8,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env['CI'] ? [['html', { open: 'never' }], ['github']] : 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env['PLAYWRIGHT_TEST_BASE_URL'] ?? `http://localhost:${E2E_PORT}`,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Screenshot only on failure keeps report size small while still giving proof on red runs. */
    screenshot: 'only-on-failure',

    /* Video only on the first retry — cheap signal for flaky/failing specs without bloating every run. */
    video: 'on-first-retry',
  },

  /*
   * Desktop projects run every spec EXCEPT `*.mobile.spec.ts`, and the mobile
   * projects run only those. The split is not cosmetic: a device preset sets
   * the viewport, `isMobile`, `hasTouch` and the user agent for the whole
   * project, so running the existing suite under `Pixel 5` would put fifteen
   * desktop-oriented specs on a 393px screen. The twelve specs that already
   * call `page.setViewportSize({ width: 375 })` would not benefit either —
   * an explicit viewport overrides the preset's, and only the preset's, size:
   * touch emulation and the mobile user agent stay whatever the project says.
   * A `*.mobile.spec.ts` therefore gets what those twelve cannot have — real
   * touch input, `pointer: coarse`, and a mobile UA — while the desktop suite
   * keeps its own contract.
   */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /.*\.mobile\.spec\.ts/,
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: /.*\.mobile\.spec\.ts/,
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: /.*\.mobile\.spec\.ts/,
    },

    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: /.*\.mobile\.spec\.ts/,
    },

    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      testMatch: /.*\.mobile\.spec\.ts/,
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /*
   * Starts the SSR-less `e2e` build (see comment on E2E_PORT above) before
   * running tests, reusing an already-running instance locally so repeated
   * runs stay fast.
   */
  webServer: {
    command: `npx ng serve --configuration=e2e --port=${E2E_PORT}`,
    url: `http://localhost:${E2E_PORT}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
