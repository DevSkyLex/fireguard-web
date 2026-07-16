import { expect, test } from '@playwright/test';
import { ApiMock } from '../support/mocks/api-mock';
import { LoginPage } from '../support/pages/login.page';
import { MfaVerifyPage } from '../support/pages/mfa-verify.page';

/**
 * MFA verification flow — `/auth/mfa-verify` (`MfaVerificationPage`,
 * `src/app/features/auth`). Only reachable via a login response with
 * `mfa_required: true`, so every test drives the login form first.
 */
test.describe('MFA verification', () => {
  test('redirects a direct visit to login when MFA is not pending', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();

    await page.goto('/auth/mfa-verify');

    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('verifies the code and lands on the default organization workspace', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    await api.mockLoginMfaRequired();
    await api.mockMfaVerifySuccess();
    await api.mockSessionData();

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('mfa.user@fireguard.test', 'Sup3rSecret!');

    const mfaPage = new MfaVerifyPage(page);
    await mfaPage.waitForLoad();
    await mfaPage.verify('123456');

    await expect(page).toHaveURL(/\/organizations\/e2e-org-1$/);
    await expect(page.locator('#organization-overview')).toBeVisible();
  });

  test('shows an error and stays on the page for an invalid code', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    await api.mockLoginMfaRequired();
    await api.mockMfaVerifyFailure();

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('mfa.user@fireguard.test', 'Sup3rSecret!');

    const mfaPage = new MfaVerifyPage(page);
    await mfaPage.waitForLoad();
    await mfaPage.verify('000000');

    await expect(page).toHaveURL(/\/auth\/mfa-verify/);
  });

  test('cancel returns to the login page', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    await api.mockLoginMfaRequired();

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('mfa.user@fireguard.test', 'Sup3rSecret!');

    const mfaPage = new MfaVerifyPage(page);
    await mfaPage.waitForLoad();
    await mfaPage.otpForm.cancelButton.click();

    await expect(page).toHaveURL('/auth/login');
  });
});
