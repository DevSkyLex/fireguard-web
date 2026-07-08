import { expect, test } from '@playwright/test';
import { ApiMock } from '../support/mocks/api-mock';
import { RegisterVerifyPage } from '../support/pages/register-verify.page';
import { RegisterPage } from '../support/pages/register.page';

/**
 * Registration email-verification flow — `/auth/register/verify`
 * (`RegisterVerifyPage`, `src/app/features/auth`). Only reachable after a
 * successful registration (`registerStore.hasChallenge()`), so every test
 * drives the register form first.
 */
test.describe('Register verify', () => {
  test('redirects a direct visit to register when there is no pending challenge', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();

    await page.goto('/auth/register/verify');

    await expect(page).toHaveURL('/auth/register');
  });

  test('verifies the code, authenticates, and lands on onboarding', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    await api.mockRegisterSuccess();
    await api.mockRegisterVerifySuccess();
    await api.mockSessionData({ onboarding: { state: 'in_progress' } });

    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.fillForm({
      firstName: 'Ella',
      lastName: 'Uzer',
      email: 'e2e.user@fireguard.test',
      password: 'Sup3rSecret!',
    });
    await registerPage.submit();

    const verifyPage = new RegisterVerifyPage(page);
    await verifyPage.waitForLoad();
    await verifyPage.verify('123456');

    await expect(page).toHaveURL(/\/onboarding/);
  });

  test('shows an error and stays on the page for an invalid code', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    await api.mockRegisterSuccess();
    await api.mockRegisterVerifyFailure();

    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.fillForm({
      firstName: 'Ella',
      lastName: 'Uzer',
      email: 'e2e.user@fireguard.test',
      password: 'Sup3rSecret!',
    });
    await registerPage.submit();

    const verifyPage = new RegisterVerifyPage(page);
    await verifyPage.waitForLoad();
    await verifyPage.verify('000000');

    await expect(page).toHaveURL('/auth/register/verify');
  });

  test('cancel returns to the register page', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    await api.mockRegisterSuccess();

    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.fillForm({
      firstName: 'Ella',
      lastName: 'Uzer',
      email: 'e2e.user@fireguard.test',
      password: 'Sup3rSecret!',
    });
    await registerPage.submit();

    const verifyPage = new RegisterVerifyPage(page);
    await verifyPage.waitForLoad();
    await verifyPage.otpForm.cancelButton.click();

    await expect(page).toHaveURL('/auth/register');
  });
});
