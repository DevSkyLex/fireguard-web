import { type Locator, type Page } from '@playwright/test';

/**
 * OrganizationOverviewPage
 *
 * Page object for `/organizations/:organizationId`
 * (`OrganizationOverviewPage`, `src/app/features/organization/ui/pages/organization-overview`).
 *
 * Scoped to guard/landing smoke coverage: the dashboard body
 * (`app-organization-dashboard`) loads several trend-chart endpoints that
 * are intentionally left unmocked here (see `e2e/README.md`) — the safety
 * net 404s them, which is fine for asserting routing/guard behavior but
 * does not exercise the dashboard's own rendering.
 */
export class OrganizationOverviewPage {
  public readonly page: Page;
  public readonly root: Locator;

  public constructor(page: Page) {
    this.page = page;
    this.root = page.locator('#organization-overview');
  }

  public async goto(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}`);
  }
}
