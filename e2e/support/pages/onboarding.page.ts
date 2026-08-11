import type { Locator, Page } from '@playwright/test';

/**
 * Page object OnboardingPage
 *
 * @description
 * Wraps the mandatory activation wizard (`/onboarding`) behind named
 * locators — the split shell, its branded showcase panel, and the
 * `create_organization` first-step form.
 */
export class OnboardingPage {
  public constructor(private readonly page: Page) {}

  public readonly shellRoot: Locator = this.page.locator('#split-layout');
  public readonly showcasePanel: Locator = this.page.locator('#split-layout-showcase');
  public readonly content: Locator = this.page.locator('#split-layout-content');

  public readonly orgNameInput: Locator = this.page.getByTestId('onboarding-org-name');
  public readonly orgSlugInput: Locator = this.page.getByTestId('onboarding-org-slug');
  public readonly orgSubmit: Locator = this.page.getByTestId('onboarding-org-submit');
  public readonly orgError: Locator = this.page.getByTestId('onboarding-org-error');

  public readonly skipButton: Locator = this.page.getByTestId('onboarding-wizard-skip');
  public readonly blockedBanner: Locator = this.page.getByTestId('onboarding-wizard-blocked');
  public readonly loadingIndicator: Locator = this.page.getByTestId('onboarding-wizard-loading');

  public async goto(): Promise<void> {
    await this.page.goto('/onboarding');
  }
}
