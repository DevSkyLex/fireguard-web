import type { Locator, Page } from '@playwright/test';

/**
 * Page object OrganizationSwitcherPage
 *
 * @description
 * Wraps the sidebar-header organization switcher — the trigger and its menu.
 * The switcher is shell chrome rendered on every organization-scoped route,
 * so this object carries no `goto`; drive a page object for the route under
 * test first. Leaving an organization is driven from `AccountOrganizationsPage`
 * (`/account/organizations`), not from this menu.
 */
export class OrganizationSwitcherPage {
  public constructor(private readonly page: Page) {}

  public readonly trigger: Locator = this.page.locator('#organization-switcher-trigger');

  /** Opens the switcher's dropdown menu. */
  public async open(): Promise<void> {
    await this.trigger.click();
  }
}
