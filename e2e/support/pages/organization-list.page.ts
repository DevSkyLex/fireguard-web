import { expect, type Locator, type Page } from '@playwright/test';

/**
 * OrganizationListPage
 *
 * Page object for `/organizations` (`OrganizationListPage`,
 * `src/app/features/organization/ui/pages/organization-list`).
 */
export class OrganizationListPage {
  public readonly page: Page;
  public readonly root: Locator;
  public readonly newOrganizationButton: Locator;

  public constructor(page: Page) {
    this.page = page;
    this.root = page.locator('#organization-list');
    this.newOrganizationButton = page.getByRole('button', { name: 'New organization' });
  }

  public async goto(): Promise<void> {
    await this.page.goto('/organizations');
    await expect(this.root).toBeVisible();
  }
}
