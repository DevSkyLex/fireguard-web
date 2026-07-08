import { expect, test } from '@playwright/test';
import { ApiMock } from '../support/mocks/api-mock';
import { RegisterPage } from '../support/pages/register.page';

/**
 * Registration flow — `/auth/register` (`RegisterPage`, `src/app/features/auth`).
 */
test.describe('Register', () => {
  test('renders the registration form', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();

    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    await expect(registerPage.firstNameInput).toBeVisible();
    await expect(registerPage.lastNameInput).toBeVisible();
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.confirmPasswordInput).toBeVisible();
  });

  test('submits and navigates to email verification on success', async ({ page }) => {
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

    await expect(page).toHaveURL('/auth/register/verify');
  });

  test('shows a mismatch error when passwords do not match', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();

    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.fillForm({
      firstName: 'Ella',
      lastName: 'Uzer',
      email: 'e2e.user@fireguard.test',
      password: 'Sup3rSecret!',
      confirmPassword: 'DoesNotMatch!',
    });
    await registerPage.confirmPasswordInput.blur();

    await expect(page.locator('form')).toContainText(/do not match/i);
    await expect(registerPage.submitButton).toBeDisabled();
  });

  test('stays on the page and surfaces a conflict when the email is already taken', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    await api.mockRegisterConflict();

    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.fillForm({
      firstName: 'Ella',
      lastName: 'Uzer',
      email: 'taken@fireguard.test',
      password: 'Sup3rSecret!',
    });
    await registerPage.submit();

    await expect(page).toHaveURL('/auth/register');
  });
});
