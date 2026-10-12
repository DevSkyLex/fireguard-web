import { expect, test } from '@playwright/test';
import { loginOutput } from '../support/fixtures/api-fixtures';
import { setDarkTheme, expectNoHorizontalOverflow } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { AuthPages } from '../support/pages/auth.page';

for (const theme of ['light', 'dark'] as const) {
  test(`uses a configured provider and a recovery proof with clean callback history in ${theme} mode`, async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    if (theme === 'dark') await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    await api.mockFederatedLoginComplete(
      'company',
      loginOutput({
        access_token: null,
        expires_in: null,
        mfa_required: true,
        mfa_token: 'recovery-pre-auth',
        challenge_token: 'recovery-challenge',
        mfa_method: 'totp',
        mfa_destination: null,
      }),
    );
    await page.goto('/auth/federated/company/callback?code=one-time-code&state=flow-state');
    await expect(page.locator('#mfa-verify-page')).toBeVisible();
    await expect(page).not.toHaveURL(/code=|state=/);
    await page.getByRole('button', { name: 'Use a recovery code', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Recovery code', { exact: true })).toBeVisible();
    await page
      .getByLabel('Recovery code', { exact: true })
      .fill('1234-5678-9abc-def0-1234-5678-9abc-def0');
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: testInfo.outputPath(`recovery-${theme}.png`),
      animations: 'disabled',
    });
    await api.mockMfaVerify(loginOutput());
    await api.mockSessionData();
    const request = page.waitForRequest((candidate) =>
      candidate.url().endsWith('/api/auth/mfa/verify'),
    );
    await page.getByRole('button', { name: 'Use recovery code', exact: true }).click();
    const submitted = await request;
    expect(submitted.postDataJSON()).toEqual({
      preAuthToken: 'recovery-pre-auth',
      code: '123456789abcdef0123456789abcdef0',
      method: 'recovery_code',
    });
    expect(submitted.headers()['idempotency-key']).toMatch(/^[a-f0-9-]{36}$/);
    await expect(page).not.toHaveURL(/mfa-verify/);
  });
}

test('blocks registration while the published password policy is unavailable and retries it', async ({
  page,
}) => {
  const api = new ApiMock(page);
  const auth = new AuthPages(page);
  await api.mockUnauthenticatedSession();
  let requests = 0;
  let registrations = 0;
  await page.route('**/api/auth/register', async (route) => {
    registrations++;
    expect(route.request().postDataJSON().password).toBe('🧯abc');
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        '@id': '/api/auth/register',
        '@type': 'RegisterOutput',
        success: true,
        message: 'Account created',
      }),
    });
  });
  await page.route('**/api/auth/password-policy', async (route) => {
    requests++;
    await route.fulfill({
      status: requests === 1 ? 500 : 200,
      contentType: 'application/json',
      body: JSON.stringify(
        requests === 1
          ? { title: 'Unavailable' }
          : {
              '@id': '/api/auth/password-policy',
              '@type': 'PasswordPolicy',
              minimumLength: 4,
              maximumLength: 64,
              requireUppercase: false,
              requireLowercase: false,
              requireDigit: false,
              specialCharacters: '',
              allowedInitialCharacters: null,
            },
      ),
    });
  });
  await auth.gotoRegister();
  await expect(
    page.getByText('Password requirements are unavailable', { exact: true }),
  ).toBeVisible();
  await auth.registerFirstName.fill('Ada');
  await auth.registerLastName.fill('Lovelace');
  await auth.registerEmail.fill('ada@example.test');
  await auth.registerPassword.fill('🧯abc');
  await auth.registerConfirmPassword.fill('🧯abc');
  await auth.registerSubmit.click();
  expect(registrations).toBe(0);
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(
    page.getByText('Password requirements are unavailable', { exact: true }),
  ).toHaveCount(0);
  await expect(auth.registerSubmit).toBeEnabled();
  expect(requests).toBe(2);
  await auth.registerSubmit.focus();
  await expect(auth.registerSubmit).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#login-page')).toBeVisible();
  expect(registrations).toBe(1);
});

test('finishes registration when the HTTP response has no verification challenge', async ({
  page,
}) => {
  const api = new ApiMock(page);
  const auth = new AuthPages(page);
  await api.mockUnauthenticatedSession();
  await page.route('**/api/auth/register', async (route) => {
    expect(route.request().method()).toBe('POST');
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        '@id': '/api/auth/register',
        '@type': 'RegisterOutput',
        success: true,
        message: 'Account created',
      }),
    });
  });
  await auth.gotoRegister();
  await auth.register({
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.test',
    password: 'Str0ng!Passw0rd',
  });
  await expect(page.locator('#login-page')).toBeVisible();
  await expect(
    page.getByText('Your account has been created. You can now sign in.', { exact: true }),
  ).toBeVisible();
  await expect(page).not.toHaveURL(/verify|token=/);
});
