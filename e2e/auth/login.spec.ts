import { expect, test } from '@playwright/test';
import { ApiMock } from '../support/mocks/api-mock';
import { LoginPage } from '../support/pages/login.page';

/**
 * Login flow — `/auth/login` (`LoginPage`, `src/app/features/auth`).
 *
 * All backend calls are mocked at the network layer (see `ApiMock`), so these
 * tests run without a live API and are deterministic across environments.
 */
test.describe('Login', () => {
  test('renders the login form', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();

    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.submitButton).toBeDisabled();
  });

  test('signs in and lands on the default organization workspace', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    await api.mockLoginSuccess();
    await api.mockSessionData();

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('e2e.user@fireguard.test', 'Sup3rSecret!');

    await expect(page).toHaveURL(/\/organizations\/e2e-org-1$/);
    await expect(page.locator('#organization-today')).toBeVisible();
    expect(api.loginCallCount).toBe(1);
  });

  test('shows a validation error and keeps submit disabled for an invalid email', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();

    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.emailInput.fill('not-an-email');
    await loginPage.emailInput.blur();
    await loginPage.passwordInput.fill('Sup3rSecret!');

    await expect(loginPage.errorMessage).toContainText(/valid email/i);
    await expect(loginPage.submitButton).toBeDisabled();
  });

  test('surfaces an inline error on invalid credentials and stays on the login page', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    await api.mockLoginFailure(401, 'Invalid credentials');

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('e2e.user@fireguard.test', 'wrong-password');

    await expect(page).toHaveURL('/auth/login');
    expect(api.loginCallCount).toBe(1);
  });

  test('redirects to MFA verification when the account requires a second factor', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    await api.mockLoginMfaRequired();

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('mfa.user@fireguard.test', 'Sup3rSecret!');

    await expect(page).toHaveURL(/\/auth\/mfa-verify/);
  });

  test('navigates to the register page from "Create one"', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.createAccountLink.click();

    await expect(page).toHaveURL('/auth/register');
  });

  test('navigates to forgot password from "Forgot password?"', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.forgotPasswordLink.click();

    await expect(page).toHaveURL('/auth/password-reset/forgot');
  });
});
