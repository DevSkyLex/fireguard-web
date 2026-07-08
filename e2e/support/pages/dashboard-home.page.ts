import { expect, type Locator, type Page } from '@playwright/test';

/**
 * DashboardHomePage
 *
 * Page object for the authenticated landing route `/`
 * (`HomePage`, `src/app/features/main/ui/pages/home-page`), rendered inside
 * `DashboardLayout`.
 */
export class DashboardHomePage {
  public readonly page: Page;
  public readonly root: Locator;
  public readonly organizationsQuickAccessLink: Locator;
  public readonly organizationSwitcher: Locator;
  public readonly accountProfileMenu: Locator;
  public readonly notificationBell: Locator;

  public constructor(page: Page) {
    this.page = page;
    this.root = page.locator('#home-page');
    this.organizationsQuickAccessLink = page.locator('#home-page a[routerLink="/organizations"]');
    this.organizationSwitcher = page.locator('app-organization-switcher');
    this.accountProfileMenu = page.locator('app-account-profile-panel');
    this.notificationBell = page.locator('app-notification-bell');
  }

  public async goto(): Promise<void> {
    await this.page.goto('/');
    await expect(this.root).toBeVisible();
  }
}
