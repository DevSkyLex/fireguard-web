import { expect, type Locator, type Page } from '@playwright/test';

/**
 * AccountTab
 *
 * Section identifiers accepted by the `tab` query parameter
 * (`AccountPage`, `src/app/features/account/ui/pages/account-page`).
 */
export type AccountTab = 'profile' | 'settings' | 'security' | 'notifications';

/**
 * AccountPage
 *
 * Page object for `/account` (`AccountPage`,
 * `src/app/features/account/ui/pages/account-page`). Sections are
 * query-param driven (`?tab=`), not separate routes, so `goto()` navigates
 * directly to a tab instead of clicking the PrimeNG `p-menu` nav.
 */
export class AccountPage {
  public readonly page: Page;
  public readonly header: Locator;
  public readonly displayName: Locator;
  public readonly nav: Locator;
  public readonly sectionTitle: Locator;

  public constructor(page: Page) {
    this.page = page;
    this.header = page.getByTestId('account-page-header');
    // The display name is the page h1 rendered by the shared `app-page-header`
    // primitive; located by role within the header hook since the primitive
    // owns its internal markup.
    this.displayName = this.header.getByRole('heading', { level: 1 });
    this.nav = page.getByTestId('account-page-nav');
    this.sectionTitle = page.getByTestId('account-page-section-title');
  }

  public async goto(tab?: AccountTab): Promise<void> {
    await this.page.goto(tab ? `/account?tab=${tab}` : '/account');
    await expect(this.header).toBeVisible();
  }
}
