import { expect, test } from '@playwright/test';
import { E2E_ACCESS_TOKEN } from '../support/fixtures/api-fixtures';

const apiOrigin = 'https://127.0.0.1:4275';
const appOrigin = 'http://127.0.0.1:4274';

test('renders the public password policy and consumes its SSR handoff before another browser read', async ({
  page,
  request,
}) => {
  const before = await (await request.get(`${apiOrigin}/__harness/requests`)).json();
  const response = await request.get('/auth/register');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('id="register-page"');
  const serialized = html.match(
    /<script id="ng-state" type="application\/json">([\s\S]*?)<\/script>/,
  )?.[1];
  expect(serialized).toBeTruthy();
  if (!serialized) throw new Error('SSR state is missing.');
  const state = JSON.parse(serialized);
  expect(state['auth-password-policy']).toMatchObject({
    minimumLength: 8,
    maximumLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireDigit: true,
    specialCharacters: '@$!%*?&#',
  });
  expect(html).not.toContain(E2E_ACCESS_TOKEN);
  expect(html).not.toContain('recovery-pre-auth');
  const after = await (await request.get(`${apiOrigin}/__harness/requests`)).json();
  expect(
    after.requests
      .slice(before.requests.length)
      .filter((entry: { path: string }) => entry.path === '/api/auth/password-policy'),
  ).toHaveLength(1);

  let browserPolicyReads = 0;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (value) => {
    if (new URL(value.url()).pathname === '/api/auth/password-policy') browserPolicyReads++;
  });
  await page.goto('/auth/register');
  await expect(page.locator('#register-page')).toBeVisible();
  await expect(page.locator('[ngh]')).toHaveCount(0);
  await expect(page.locator('#register-password')).toBeVisible();
  expect(browserPolicyReads).toBe(0);
  expect(errors).toEqual([]);
  const ledger = await (await request.get(`${apiOrigin}/__harness/requests`)).json();
  expect(ledger.unexpected).toEqual([]);
});

test('keeps account security SSR shells free of private state for two distinct users', async ({
  browser,
  request,
}) => {
  const contexts = await Promise.all(
    ['a', 'b'].map(async (identity) => {
      const context = await browser.newContext({
        baseURL: appOrigin,
        ignoreHTTPSErrors: true,
        serviceWorkers: 'block',
      });
      await context.addCookies([
        {
          name: 'refresh_token',
          value: `ssr-harness-session-${identity}`,
          url: apiOrigin,
          secure: true,
          sameSite: 'None',
        },
      ]);
      return context;
    }),
  );
  try {
    const users = await Promise.all(
      contexts.map(async (context) => (await context.request.get(`${apiOrigin}/api/me`)).json()),
    );
    expect(users.map((user) => user.id)).toEqual(['e2e-user-a', 'e2e-user-b']);
    const before = await (await request.get(`${apiOrigin}/__harness/requests`)).json();
    const responses = await Promise.all(
      contexts.map((context) => context.request.get('/account/security')),
    );
    for (const response of responses) expect(response.status()).toBe(200);
    const htmls = await Promise.all(responses.map((response) => response.text()));
    for (const html of htmls) {
      expect(html).toContain('<app-root></app-root>');
      expect(html).not.toMatch(/\sngh="/);
      expect(html).not.toContain('auth-password-policy');
      expect(html).not.toContain('recovery-codes');
      expect(html).not.toContain(E2E_ACCESS_TOKEN);
      for (const user of users) expect(html).not.toContain(user.email);
    }
    const after = await (await request.get(`${apiOrigin}/__harness/requests`)).json();
    expect(after.requests.slice(before.requests.length)).toEqual([]);
    expect(after.unexpected).toEqual([]);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
