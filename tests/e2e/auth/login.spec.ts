import { expect, test } from '@playwright/test';
import { loginOutput } from '../support/fixtures/api-fixtures';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { pagePolishScreenshotDir } from '../support/helpers/screenshot-dir';
import { ApiMock } from '../support/mocks/api-mock';
import { AuthPages } from '../support/pages/auth.page';

test.describe('Sign in', () => {
  test('renders the sign-in form', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    const auth = new AuthPages(page);

    await auth.gotoLogin();

    await expect(auth.loginRoot).toBeVisible();
    await expect(auth.loginEmail).toBeVisible();
    await expect(auth.loginPassword).toBeVisible();
    await expect(auth.loginSubmit).toBeVisible();
  });

  test('signs in and leaves the login route on success', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    await api.mockLogin(loginOutput());
    await api.mockSessionData();
    const auth = new AuthPages(page);

    await auth.gotoLogin();
    await auth.login('e2e.user@fireguard.test', 'Passw0rd!');

    await expect(page).not.toHaveURL(/\/auth\/login$/, { timeout: 10_000 });
  });

  test('stays on the login route when the credentials are rejected', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    await api.mockLoginError();
    const auth = new AuthPages(page);

    await auth.gotoLogin();
    await auth.login('e2e.user@fireguard.test', 'WrongPassw0rd!');

    await expect(page).toHaveURL(/\/auth\/login$/);
  });

  test('routes to MFA verification when the login response requires a second factor', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    await api.mockLogin(
      loginOutput({
        access_token: '',
        expires_in: 0,
        mfa_required: true,
        mfa_token: 'e2e-mfa-pre-auth-token',
        challenge_token: 'e2e-mfa-challenge-token',
        mfa_method: 'email',
        mfa_destination: 'e***r@f*******d.test',
        mfa_resend_in: 30,
      }),
    );
    const auth = new AuthPages(page);

    await auth.gotoLogin();
    await auth.login('e2e.user@fireguard.test', 'Passw0rd!');

    await expect(page).toHaveURL(/\/auth\/mfa-verify$/);
    await expect(auth.mfaVerifyRoot).toBeVisible();
  });
});

test.describe('visual evidence', () => {
  test('renders the sign-in form à 375px en mode sombre', async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await page.setViewportSize({ width: 375, height: 812 });
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    const auth = new AuthPages(page);

    await auth.gotoLogin();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(auth.loginRoot).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: `${pagePolishScreenshotDir(testInfo.project.name)}/login-375-dark.png`,
    });
  });

  test('renders the sign-in form à 1280px en mode clair', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    const auth = new AuthPages(page);

    await auth.gotoLogin();

    await expect(auth.loginRoot).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: `${pagePolishScreenshotDir(testInfo.project.name)}/login-1280-light.png`,
    });
  });
});
