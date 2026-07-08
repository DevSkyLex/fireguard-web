import { expect, test } from '@playwright/test';
import { ApiMock } from '../support/mocks/api-mock';
import { ForgotPasswordPage } from '../support/pages/forgot-password.page';
import { NewPasswordPage } from '../support/pages/new-password.page';
import { PasswordResetVerifyPage } from '../support/pages/password-reset-verify.page';

/**
 * Password-reset verify + new-password flow —
 * `/auth/password-reset/verify` and `/auth/password-reset/new`
 * (`PasswordResetVerifyPage` / `NewPasswordPage`, `src/app/features/auth`).
 */
test.describe('Password reset verify and new password', () => {
  test('redirects a direct visit to forgot-password with no token', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();

    await page.goto('/auth/password-reset/verify');

    await expect(page).toHaveURL('/auth/password-reset/forgot');
  });

  test('redirects new-password to forgot-password with no challenge token', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();

    await page.goto('/auth/password-reset/new');

    await expect(page).toHaveURL('/auth/password-reset/forgot');
  });

  test('completes the full flow: request -> verify -> new password -> login', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockUnauthenticatedSession();
    await api.mockPasswordResetRequestSuccess();
    await api.mockPasswordResetConfirmSuccess();

    const forgotPasswordPage = new ForgotPasswordPage(page);
    await forgotPasswordPage.goto();
    await forgotPasswordPage.requestReset('e2e.user@fireguard.test');

    const verifyPage = new PasswordResetVerifyPage(page);
    await verifyPage.waitForLoad();
    await verifyPage.verify('123456');

    const newPasswordPage = new NewPasswordPage(page);
    await newPasswordPage.waitForLoad();
    await newPasswordPage.submit('N3wSup3rSecret!');

    await expect(page).toHaveURL(/\/auth\/login\?passwordReset=success/);
  });
});
