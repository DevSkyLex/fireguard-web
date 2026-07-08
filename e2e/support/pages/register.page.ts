import { expect, type Locator, type Page } from '@playwright/test';

/**
 * RegisterPage
 *
 * Page object for `/auth/register` (`RegisterPage` + `RegisterForm`,
 * `src/app/features/auth/ui/pages/register-page`).
 */
export class RegisterPage {
  public readonly page: Page;
  public readonly firstNameInput: Locator;
  public readonly lastNameInput: Locator;
  public readonly emailInput: Locator;
  public readonly passwordInput: Locator;
  public readonly confirmPasswordInput: Locator;
  public readonly submitButton: Locator;

  public constructor(page: Page) {
    this.page = page;
    this.firstNameInput = page.locator('input#firstName');
    this.lastNameInput = page.locator('input#lastName');
    this.emailInput = page.locator('input#email');
    this.passwordInput = page.locator('#password input');
    this.confirmPasswordInput = page.locator('#confirmPassword input');
    this.submitButton = page.locator('form button[type="submit"]');
  }

  public async goto(): Promise<void> {
    await this.page.goto('/auth/register');
    await expect(this.firstNameInput).toBeVisible();
  }

  public async fillForm(values: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword?: string;
  }): Promise<void> {
    await this.firstNameInput.fill(values.firstName);
    await this.lastNameInput.fill(values.lastName);
    await this.emailInput.fill(values.email);
    await this.passwordInput.fill(values.password);
    await this.confirmPasswordInput.fill(values.confirmPassword ?? values.password);
  }

  public async submit(): Promise<void> {
    await this.submitButton.click();
  }
}
