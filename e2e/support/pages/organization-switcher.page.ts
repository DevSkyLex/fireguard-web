import type { Locator, Page } from '@playwright/test';

/**
 * Page object OrganizationSwitcherPage
 *
 * @description
 * Wraps the sidebar-header organization switcher — the trigger, its menu,
 * and the "Leave organization…" confirmation it opens. The switcher is
 * shell chrome rendered on every organization-scoped route, so this object
 * carries no `goto`; drive a page object for the route under test first.
 */
export class OrganizationSwitcherPage {
  public constructor(private readonly page: Page) {}

  public readonly trigger: Locator = this.page.locator('#organization-switcher-trigger');
  public readonly leaveMenuItem: Locator = this.page.getByTestId('organization-switcher-leave');
  public readonly leaveDialog: Locator = this.page.getByTestId('organization-leave-dialog');
  public readonly leaveConfirmButton: Locator = this.page.getByTestId('organization-leave-confirm');
  public readonly leaveErrorMessage: Locator = this.page.getByTestId('organization-leave-error');

  /** Opens the switcher's dropdown menu. */
  public async open(): Promise<void> {
    await this.trigger.click();
  }

  /** Opens the menu and picks "Leave organization…", landing on the confirmation. */
  public async startLeaving(): Promise<void> {
    await this.open();
    await this.leaveMenuItem.click();
  }

  /** Confirms the open leave dialog. */
  public async confirmLeave(): Promise<void> {
    await this.leaveConfirmButton.click();
  }
}
