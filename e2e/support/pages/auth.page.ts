import type { Locator, Page } from '@playwright/test';

/**
 * Page object AuthPages
 *
 * @description
 * Wraps the public authentication routes — sign-in (`/auth/login`),
 * registration (`/auth/register`), email verification
 * (`/auth/register/verify`) and MFA verification (`/auth/mfa-verify`) —
 * behind named locators and one method per user intent. The password fields
 * carry no `data-testid`: `app-password-input` forwards only the DOM `id` a
 * caller passes it, so they are located by `id` like every other hook here.
 */
export class AuthPages {
  public constructor(private readonly page: Page) {}

  public readonly loginRoot: Locator = this.page.locator('#login-page');
  public readonly loginEmail: Locator = this.page.getByTestId('login-email');
  public readonly loginPassword: Locator = this.page.locator('#login-password');
  public readonly loginRemember: Locator = this.page.getByTestId('login-remember');
  public readonly loginSubmit: Locator = this.page.getByTestId('login-submit');

  public readonly registerRoot: Locator = this.page.locator('#register-page');
  public readonly registerFirstName: Locator = this.page.getByTestId('register-first-name');
  public readonly registerLastName: Locator = this.page.getByTestId('register-last-name');
  public readonly registerEmail: Locator = this.page.getByTestId('register-email');
  public readonly registerPassword: Locator = this.page.locator('#register-password');
  public readonly registerConfirmPassword: Locator = this.page.locator(
    '#register-confirm-password',
  );
  public readonly registerSubmit: Locator = this.page.getByTestId('register-submit');

  public readonly registerVerifyRoot: Locator = this.page.locator('#register-verify-page');
  public readonly mfaVerifyRoot: Locator = this.page.locator('#mfa-verify-page');
  public readonly otpCode: Locator = this.page.locator('#otp-code');
  public readonly otpSubmit: Locator = this.page.getByTestId('otp-submit');
  public readonly otpResend: Locator = this.page.getByTestId('otp-resend');
  public readonly otpTrustDevice: Locator = this.page.getByTestId('otp-trust-device');

  public async gotoLogin(): Promise<void> {
    await this.page.goto('/auth/login');
  }

  public async gotoRegister(): Promise<void> {
    await this.page.goto('/auth/register');
  }

  /** Fills and submits the sign-in form. */
  public async login(email: string, password: string): Promise<void> {
    await this.loginEmail.fill(email);
    await this.loginPassword.fill(password);
    await this.loginSubmit.click();
  }

  /** Fills and submits the registration form, repeating the password into the confirmation field. */
  public async register(values: {
    readonly firstName: string;
    readonly lastName: string;
    readonly email: string;
    readonly password: string;
  }): Promise<void> {
    await this.registerFirstName.fill(values.firstName);
    await this.registerLastName.fill(values.lastName);
    await this.registerEmail.fill(values.email);
    await this.registerPassword.fill(values.password);
    await this.registerConfirmPassword.fill(values.password);
    await this.registerSubmit.click();
  }

  /**
   * Types a code into the shared OTP form. `brn-input-otp` auto-submits once
   * every slot is filled (`completed` → `autoSubmit()`), which races an
   * explicit submit click on a fast browser — the button can already be
   * disabled or detached (navigated away) by the time the click lands. The
   * click is a fallback only, best-effort, for whenever auto-submit did not
   * fire.
   */
  public async submitOtp(code: string): Promise<void> {
    await this.otpCode.fill(code);
    await this.otpSubmit.click({ timeout: 2_000 }).catch(() => undefined);
  }
}
