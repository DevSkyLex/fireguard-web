import { type Locator, type Page } from '@playwright/test';

/**
 * OtpVerificationForm
 *
 * Composable helper for `app-otp-verification-form`
 * (`src/app/features/auth/ui/forms/otp-verification-form`), shared by
 * `/auth/mfa-verify`, `/auth/register/verify`, and
 * `/auth/password-reset/verify`. Not a full page object — instantiate it
 * scoped to the parent page's root locator.
 *
 * `p-inputotp` renders one native `<input>` per digit
 * (`node_modules/primeng/fesm2022/primeng-inputotp.mjs`). Filling the FIRST
 * input with the full code triggers the component's own paste-distribution
 * logic (`onInput` treats `value.length > 1` on index 0 as a paste), which
 * populates every digit cell in one call.
 */
export class OtpVerificationForm {
  public readonly root: Locator;
  public readonly codeInputs: Locator;
  public readonly trustDeviceCheckbox: Locator;
  public readonly resendButton: Locator;
  public readonly verifyButton: Locator;
  public readonly cancelButton: Locator;

  public constructor(scope: Page | Locator) {
    this.root = scope.locator('app-otp-verification-form');
    this.codeInputs = this.root.locator('#code input');
    this.trustDeviceCheckbox = this.root.locator('#trustDevice');
    this.resendButton = this.root.getByRole('button', { name: /resend/i });
    this.verifyButton = this.root.getByRole('button', { name: 'Verify' });
    this.cancelButton = this.root.getByRole('button', { name: 'Cancel' });
  }

  public async fillCode(code: string): Promise<void> {
    await this.codeInputs.first().fill(code);
  }

  public async submit(code: string): Promise<void> {
    await this.fillCode(code);
    await this.verifyButton.click();
  }
}
