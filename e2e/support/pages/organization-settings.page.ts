import type { Locator, Page } from '@playwright/test';

/**
 * Page object OrganizationSettingsPage
 *
 * @description
 * Wraps the settings route (`/organizations/:organizationId/settings`)
 * behind named locators and one method per user intent: the `?tab=`-synced
 * tab list and each tab's key content.
 */
export class OrganizationSettingsPage {
  public constructor(private readonly page: Page) {}

  public readonly root: Locator = this.page.locator('#organization-settings');

  public readonly generalTab: Locator = this.page.getByTestId('org-settings-tab-general');
  public readonly subscriptionTab: Locator = this.page.getByTestId('org-settings-tab-subscription');
  public readonly usageTab: Locator = this.page.getByTestId('org-settings-tab-usage');
  public readonly notificationsTab: Locator = this.page.getByTestId(
    'org-settings-tab-notifications',
  );
  public readonly regionalTab: Locator = this.page.getByTestId('org-settings-tab-regional');
  public readonly dangerTab: Locator = this.page.getByTestId('org-settings-tab-danger');

  public readonly billingPortalButton: Locator = this.page.getByTestId(
    'org-settings-billing-portal',
  );
  public readonly billingCheckoutButton: Locator = this.page.getByTestId(
    'org-settings-billing-checkout',
  );
  public readonly invoiceRows: Locator = this.page.getByTestId('org-settings-invoice-row');
  public readonly dangerOpenButton: Locator = this.page.getByTestId('org-settings-danger-open');

  public async goto(organizationId: string, tab?: string): Promise<void> {
    const url = tab
      ? `/organizations/${organizationId}/settings?tab=${tab}`
      : `/organizations/${organizationId}/settings`;
    await this.page.goto(url);
  }
}
