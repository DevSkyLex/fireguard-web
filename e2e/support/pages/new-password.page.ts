import { expect, type Locator, type Page } from '@playwright/test';

/**
 * NewPasswordPage
 *
 * Page object for `/auth/password-reset/new` (`NewPasswordPage`,
 * `src/app/features/auth/ui/pages/new-password-page`). Requires both a
 * challenge token and a verification code already in `PasswordResetStore`
 * (`passwordResetNewGuard`), so tests must arrive here through the forgot ->
 * verify flow rather than a direct `goto()`.
 */
export class NewPasswordPage {
  public readonly page: Page;
  public readonly newPasswordInput: Locator;
  public readonly confirmPasswordInput: Locator;
  public readonly submitButton: Locator;

  public constructor(page: Page) {
    this.page = page;
    this.newPasswordInput = page.locator('#newPassword input');
    this.confirmPasswordInput = page.locator('#confirmPassword input');
    this.submitButton = page.getByRole('button', { name: 'Reset Password' });
  }

  public async waitForLoad(): Promise<void> {
    await expect(this.page).toHaveURL('/auth/password-reset/new');
    await expect(this.newPasswordInput).toBeVisible();
  }

  public async submit(newPassword: string, confirmPassword: string = newPassword): Promise<void> {
    await this.newPasswordInput.fill(newPassword);
    await this.confirmPasswordInput.fill(confirmPassword);
    await this.submitButton.click();
  }
}
