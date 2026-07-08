import { expect, type Page } from '@playwright/test';
import { OtpVerificationForm } from './otp-verification-form';

/**
 * PasswordResetVerifyPage
 *
 * Page object for `/auth/password-reset/verify` (`PasswordResetVerifyPage`,
 * `src/app/features/auth/ui/pages/password-reset-verify-page`). Reachable
 * either via a `?token=` query param (set by the forgot-password flow) or
 * with a challenge token already held in `PasswordResetStore`
 * (`passwordResetVerifyGuard`).
 *
 * Submitting only stores the code client-side and navigates to
 * `/auth/password-reset/new` — no HTTP call happens at this step.
 */
export class PasswordResetVerifyPage {
  public readonly page: Page;
  public readonly otpForm: OtpVerificationForm;

  public constructor(page: Page) {
    this.page = page;
    this.otpForm = new OtpVerificationForm(page.locator('#password-reset-verify-page'));
  }

  public async waitForLoad(): Promise<void> {
    await expect(this.otpForm.codeInputs.first()).toBeVisible();
  }

  public async verify(code: string): Promise<void> {
    await this.otpForm.submit(code);
  }
}
