import { type Locator, type Page } from '@playwright/test';

/**
 * OrganizationTodayPage
 *
 * Page object for `/organizations/:organizationId`
 * (`OrganizationTodayPage`, `src/app/features/organization/ui/pages/organization-today`).
 *
 * The landing route lists the work waiting on the operator: overdue, sent
 * back, awaiting review, and waiting to sync. Guard/landing smoke coverage
 * only asserts the root is reached; the queues themselves need the
 * interventions collection mocked (see `e2e/README.md`).
 */
export class OrganizationTodayPage {
  public readonly page: Page;
  public readonly root: Locator;

  public constructor(page: Page) {
    this.page = page;
    this.root = page.locator('#organization-today');
  }

  public async goto(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}`);
  }
}
