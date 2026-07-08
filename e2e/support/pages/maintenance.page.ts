import { expect, type Locator, type Page } from '@playwright/test';

/**
 * MaintenancePage
 *
 * Page object for `/maintenance` (`MaintenancePage`,
 * `src/app/features/maintenance/ui/pages/maintenance-page`). No guards, no
 * data-access — a static screen with a single retry action.
 */
export class MaintenancePage {
  public readonly page: Page;
  public readonly root: Locator;
  public readonly retryButton: Locator;

  public constructor(page: Page) {
    this.page = page;
    this.root = page.locator('#maintenance-page');
    this.retryButton = this.root.getByRole('button');
  }

  public async goto(): Promise<void> {
    await this.page.goto('/maintenance');
    await expect(this.root).toBeVisible();
  }
}
