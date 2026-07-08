import { expect, type Page } from '@playwright/test';
import { OtpVerificationForm } from './otp-verification-form';

/**
 * RegisterVerifyPage
 *
 * Page object for `/auth/register/verify` (`RegisterVerifyPage`,
 * `src/app/features/auth/ui/pages/register-verify-page`). Only reachable
 * after a successful `POST /api/auth/register` (`registerVerifyGuard` checks
 * `registerStore.hasChallenge()`), so tests must arrive here through the
 * register flow rather than a direct `goto()`.
 */
export class RegisterVerifyPage {
  public readonly page: Page;
  public readonly otpForm: OtpVerificationForm;

  public constructor(page: Page) {
    this.page = page;
    this.otpForm = new OtpVerificationForm(page.locator('#register-verify-page'));
  }

  public async waitForLoad(): Promise<void> {
    await expect(this.page).toHaveURL('/auth/register/verify');
    await expect(this.otpForm.codeInputs.first()).toBeVisible();
  }

  public async verify(code: string): Promise<void> {
    await this.otpForm.submit(code);
  }
}
