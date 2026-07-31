import { expect, type Locator, type Page } from '@playwright/test';

/**
 * LoginPage
 *
 * Page object for `/auth/login` (`LoginPage` + `LoginForm`,
 * `src/app/features/auth/ui/pages/login-page`). Wraps the PrimeNG-driven
 * form controls behind intent-revealing methods so specs read as user
 * actions instead of raw selectors.
 *
 * `p-password` binds `[attr.id]="inputId"` on its own `<input>`, so
 * `#password` IS the input — never a wrapper holding one.
 */
export class LoginPage {
  public readonly page: Page;
  public readonly emailInput: Locator;
  public readonly passwordInput: Locator;
  public readonly rememberMeCheckbox: Locator;
  public readonly submitButton: Locator;
  public readonly forgotPasswordLink: Locator;
  public readonly createAccountLink: Locator;
  public readonly errorMessage: Locator;

  public constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('#login-page input#email');
    this.passwordInput = page.locator('#login-page input#password');
    this.rememberMeCheckbox = page.locator('#login-page #remember_me');
    this.submitButton = page.locator('#login-page button[type="submit"]');
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot password/i });
    this.createAccountLink = page.getByRole('link', { name: /create one/i });
    this.errorMessage = page.locator('#login-page p-message[severity="error"]');
  }

  public async goto(): Promise<void> {
    await this.page.goto('/auth/login');
    await expect(this.emailInput).toBeVisible();
  }

  public async fillCredentials(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  public async submit(): Promise<void> {
    await this.submitButton.click();
  }

  public async login(email: string, password: string): Promise<void> {
    await this.fillCredentials(email, password);
    await this.submit();
  }
}
