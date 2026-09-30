import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Page object InteractionModePage
 * @description Owns accessible appearance and navigation entry points shared by device tests.
 */
export class InteractionModePage {
  /**
   * Constructor
   * @constructor
   * @description Binds shell interactions to one hermetic browser page.
   * @access public
   * @since 1.0.0
   * @param {Page} page - Isolated test page.
   */
  public constructor(private readonly page: Page) {}

  /**
   * Property navigation
   * @readonly
   * @description Permission-filtered primary destinations.
   * @access public
   * @since 1.0.0
   * @type {Locator}
   */
  public readonly navigation: Locator = this.page.locator('#organization-mobile-navigation');

  /**
   * Property more
   * @readonly
   * @description Route-backed secondary navigation and local appearance controls.
   * @access public
   * @since 1.0.0
   * @type {Locator}
   */
  public readonly more: Locator = this.page.locator('#organization-more-page');

  /**
   * Property quickActions
   * @readonly
   * @description Shell entry point that preserves the current route.
   * @access public
   * @since 1.0.0
   * @type {Locator}
   */
  public readonly quickActions: Locator = this.page.getByTestId('dashboard-mobile-actions-trigger');

  /**
   * Property appearance
   * @readonly
   * @description Named dialog scope; assert visibility on its fixed-position drawer children.
   * @access public
   * @since 1.0.0
   * @type {Locator}
   */
  public readonly appearance: Locator = this.page.getByRole('dialog', {
    name: 'Appearance',
    exact: true,
  });

  /**
   * Method openMobileAppearance
   * @method openMobileAppearance
   * @description Opens appearance controls from the mobile quick-actions drawer.
   * @access public
   * @since 1.0.0
   * @returns {Promise<void>} Appearance drawer visible.
   */
  public async openMobileAppearance(): Promise<void> {
    await this.quickActions.click();
    await this.page
      .getByTestId('dashboard-mobile-actions-drawer')
      .getByRole('button', { name: /^Appearance:/ })
      .click();
    await expect(
      this.appearance.getByRole('heading', { name: 'Appearance', exact: true }),
    ).toBeVisible();
  }
}
