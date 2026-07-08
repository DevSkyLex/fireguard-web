import { expect, type Locator, type Page } from '@playwright/test';

/**
 * ForgotPasswordPage
 *
 * Page object for `/auth/password-reset/forgot`
 * (`ForgotPasswordPage` + `ForgotPasswordForm`,
 * `src/app/features/auth/ui/pages/forgot-password-page`).
 */
export class ForgotPasswordPage {
  public readonly page: Page;
  public readonly emailInput: Locator;
  public readonly submitButton: Locator;

  public constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input#email');
    this.submitButton = page.locator('form button[type="submit"]');
  }

  public async goto(): Promise<void> {
    await this.page.goto('/auth/password-reset/forgot');
    await expect(this.emailInput).toBeVisible();
  }

  public async requestReset(email: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }
}
