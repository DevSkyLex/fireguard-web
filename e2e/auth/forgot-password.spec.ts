import { expect, test } from '@playwright/test';
import { ApiMock } from '../support/mocks/api-mock';
import { ForgotPasswordPage } from '../support/pages/forgot-password.page';

/**
 * Forgot-password flow — `/auth/password-reset/forgot`
 * (`ForgotPasswordPage`, `src/app/features/auth`).
 */
test.describe('Forgot password', () => {
  test('renders the request form', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();

    const forgotPasswordPage = new ForgotPasswordPage(page);
    await forgotPasswordPage.goto();

    await expect(forgotPasswordPage.emailInput).toBeVisible();
    await expect(forgotPasswordPage.submitButton).toBeDisabled();
  });

  test('submits and navigates to the verification step on success', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    await api.mockPasswordResetRequestSuccess();

    const forgotPasswordPage = new ForgotPasswordPage(page);
    await forgotPasswordPage.goto();
    await forgotPasswordPage.requestReset('e2e.user@fireguard.test');

    await expect(page).toHaveURL(/\/auth\/password-reset\/verify\?token=/);
  });
});
