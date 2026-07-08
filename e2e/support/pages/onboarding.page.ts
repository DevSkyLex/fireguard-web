import { expect, type Locator, type Page } from '@playwright/test';

/**
 * OnboardingPage
 *
 * Page object for `/onboarding` (`OnboardingPage` + `app-onboarding-wizard`,
 * `src/app/features/onboarding`). Scoped to the wizard's initial "welcome"
 * phase — the step-by-step wizard flow (org creation, per-step forms) is a
 * large, self-contained workflow intentionally left out of this pass (see
 * `e2e/README.md`).
 */
export class OnboardingPage {
  public readonly page: Page;
  public readonly root: Locator;
  public readonly startSetupButton: Locator;

  public constructor(page: Page) {
    this.page = page;
    this.root = page.locator('#onboarding-wizard');
    this.startSetupButton = this.root.getByRole('button', { name: 'Start setup' });
  }

  public async goto(): Promise<void> {
    await this.page.goto('/onboarding');
    await expect(this.root).toBeVisible();
  }
}
