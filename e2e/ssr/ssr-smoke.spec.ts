import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { devices, expect, test } from '@playwright/test';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { sourceFingerprint } from '../support/helpers/visual-run';
import { AuthPages } from '../support/pages/auth.page';

const apiOrigin = 'https://127.0.0.1:4275';
const appOrigin = 'http://127.0.0.1:4274';
const run = process.env['FG_SSR_RUN'] ?? 'current';
if (!/^[a-zA-Z0-9_-]+$/.test(run)) throw new Error('Invalid SSR run name.');
const evidenceRoot = resolve('e2e/artifacts/ssr-smoke', run);

/**
 * Function sourceEvidence
 * @description Distinguishes the current checkout from recorded build inputs; never claims an
 * unrecorded baseline was compiled from the tree observed at runtime.
 * @access private
 * @since 1.0.0
 * @returns {Promise<object>} Runtime identity and optional immutable build identity.
 */
async function sourceEvidence(): Promise<object> {
  const build = await readFile(resolve(evidenceRoot, 'server/build.json'), 'utf8').then(
    (json) => JSON.parse(json),
    () => null,
  );
  return {
    runtimeSource: sourceFingerprint(),
    build,
    buildIdentity: build ? 'recorded' : 'unrecorded-baseline',
  };
}

test('renders login HTML through a server-side API call before any browser JavaScript', async ({
  request,
}, info) => {
  const before = await (await request.get(`${apiOrigin}/__harness/requests`)).json();
  const response = await request.get('/auth/login');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('id="login-page"');
  expect(html).toContain('data-testid="login-email"');
  expect(html).toMatch(/\sngh="/);
  const serializedState = html.match(
    /<script id="ng-state" type="application\/json">([\s\S]*?)<\/script>/,
  )?.[1];
  expect(serializedState, 'SSR must serialize the public runtime environment.').toBeTruthy();
  if (!serializedState) throw new Error('SSR runtime environment is missing.');
  const state = JSON.parse(serializedState);
  expect(state['fireguard-runtime-environment']).toMatchObject({
    apiUrl: apiOrigin,
    production: true,
  });
  const after = await (await request.get(`${apiOrigin}/__harness/requests`)).json();
  const serverReads = after.requests.slice(before.requests.length);
  expect(serverReads).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ method: 'POST', path: '/api/auth/refresh', status: 401 }),
    ]),
  );
  expect(after.unexpected).toEqual([]);
  const directory = resolve(evidenceRoot, info.project.name);
  await mkdir(directory, { recursive: true });
  await writeFile(
    resolve(directory, 'server-render.json'),
    JSON.stringify(
      {
        source: await sourceEvidence(),
        scenarios: [
          'Raw HTTP login response contains server-rendered form and hydration markers',
          'Server auth refresh reaches local HTTPS fixture before browser creation',
        ],
        status: response.status(),
        serverReads,
      },
      null,
      2,
    ),
  );
});

for (const mobile of [false, true]) {
  test(`hydrates the ${mobile ? 'mobile' : 'narrow desktop'} login and handles a stubbed submit`, async ({
    browser,
    browserName,
    request,
  }, info) => {
    const preset =
      devices[
        browserName === 'webkit'
          ? mobile
            ? 'iPhone 12'
            : 'Desktop Safari'
          : mobile
            ? 'Pixel 5'
            : 'Desktop Chrome'
      ];
    const context = await browser.newContext({
      ...preset,
      viewport: { width: 375, height: 812 },
      baseURL: appOrigin,
      ignoreHTTPSErrors: true,
      serviceWorkers: 'block',
      reducedMotion: 'reduce',
    });
    try {
      if (mobile)
        await emulateMobilePlatform(context, browserName === 'webkit' ? 'ios' : 'android');
      await context.route('**/*', async (route) => {
        const origin = new URL(route.request().url()).origin;
        if ([appOrigin, apiOrigin].includes(origin)) return route.continue();
        await route.abort();
        expect
          .soft(origin, 'Hermetic SSR browser request escaped the local harness.')
          .toBe(appOrigin);
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (
          message.type() === 'error' &&
          /NG05|hydration|TypeError|ReferenceError/i.test(message.text())
        )
          errors.push(message.text());
      });
      const auth = new AuthPages(page);
      await auth.gotoLogin();
      await expect(auth.loginEmail).toBeVisible();
      await expect(
        page.locator('[ngh]'),
        'SSR hydration must complete before any form input.',
      ).toHaveCount(0);
      await expect(page.locator('html')).toHaveAttribute(
        'data-interaction-mode',
        mobile ? 'mobile' : 'desktop',
      );
      await auth.login('smoke@example.test', 'Smoke-only-password!');
      await expect(page.getByTestId('login-server-error')).toBeVisible();
      await expect(auth.loginEmail).toHaveValue('smoke@example.test');
      await expect(page).toHaveURL(/\/auth\/login$/);
      const ledger = await (await request.get(`${apiOrigin}/__harness/requests`)).json();
      expect(ledger.unexpected).toEqual([]);
      expect(ledger.requests).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ method: 'POST', path: '/api/auth/login', status: 401 }),
        ]),
      );
      expect(errors).toEqual([]);
      const directory = resolve(evidenceRoot, info.project.name);
      await mkdir(directory, { recursive: true });
      const identity = mobile ? 'mobile' : 'narrow-desktop';
      await page.screenshot({
        path: resolve(directory, `${identity}.png`),
        animations: 'disabled',
      });
      await writeFile(
        resolve(directory, `${identity}.json`),
        JSON.stringify(
          {
            source: await sourceEvidence(),
            scenarios: [
              'Real SSR response hydrated',
              `${identity} interaction-mode classification`,
              'Signal Form submit reaches local fixture and shows inline failure',
            ],
            viewport: page.viewportSize(),
            errors,
            requests: ledger.requests,
            unexpected: ledger.unexpected,
          },
          null,
          2,
        ),
      );
    } finally {
      await context.close();
    }
  });
}

test('redirects an anonymous onboarding SSR request to login using the local stub', async ({
  request,
}) => {
  const response = await request.get('/onboarding/workspace');
  expect(response.status()).toBe(200);
  expect(new URL(response.url()).pathname).toBe('/auth/login');
  expect(await response.text()).toContain('id="login-page"');
  const ledger = await (await request.get(`${apiOrigin}/__harness/requests`)).json();
  expect(ledger.unexpected).toEqual([]);
});
