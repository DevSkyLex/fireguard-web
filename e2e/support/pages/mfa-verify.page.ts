import { expect, type Page } from '@playwright/test';
import { OtpVerificationForm } from './otp-verification-form';

/**
 * MfaVerifyPage
 *
 * Page object for `/auth/mfa-verify` (`MfaVerificationPage`,
 * `src/app/features/auth/ui/pages/mfa-verification-page`). Only reachable
 * after a login response with `mfa_required: true` (`mfaGuard` checks
 * `authStore.mfaRequired()`), so tests must arrive here through the login
 * flow rather than a direct `goto()`.
 */
export class MfaVerifyPage {
  public readonly page: Page;
  public readonly otpForm: OtpVerificationForm;

  public constructor(page: Page) {
    this.page = page;
    this.otpForm = new OtpVerificationForm(page.locator('#mfa-verification-page'));
  }

  public async waitForLoad(): Promise<void> {
    await expect(this.page).toHaveURL(/\/auth\/mfa-verify/);
    await expect(this.otpForm.codeInputs.first()).toBeVisible();
  }

  public async verify(code: string): Promise<void> {
    await this.otpForm.submit(code);
  }
}
