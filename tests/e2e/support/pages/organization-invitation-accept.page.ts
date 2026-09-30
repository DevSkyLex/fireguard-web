import type { Locator, Page } from '@playwright/test';

/**
 * Page object OrganizationInvitationAcceptPage
 *
 * @description
 * Wraps the public invitation-accept route (`/organizations/invitations/accept`)
 * behind named locators and one method per user intent.
 */
export class OrganizationInvitationAcceptPage {
  public constructor(private readonly page: Page) {}

  public readonly root: Locator = this.page.locator('#organization-invitation-accept-page');
  public readonly missingToken: Locator = this.page.getByTestId(
    'organization-invitation-accept-missing-token',
  );
  public readonly loading: Locator = this.page.getByTestId(
    'organization-invitation-accept-loading',
  );
  public readonly previewError: Locator = this.page.getByTestId(
    'organization-invitation-accept-preview-error',
  );
  public readonly card: Locator = this.page.getByTestId('organization-invitation-accept-card');
  public readonly unavailable: Locator = this.page.getByTestId(
    'organization-invitation-accept-unavailable',
  );
  public readonly success: Locator = this.page.getByTestId(
    'organization-invitation-accept-success',
  );
  public readonly openOrganizationLink: Locator = this.page.getByTestId(
    'organization-invitation-accept-open',
  );
  public readonly acceptError: Locator = this.page.getByTestId(
    'organization-invitation-accept-error',
  );
  public readonly acceptSubmit: Locator = this.page.getByTestId(
    'organization-invitation-accept-submit',
  );

  public async goto(token?: string): Promise<void> {
    const url =
      token === undefined
        ? '/organizations/invitations/accept'
        : `/organizations/invitations/accept?token=${encodeURIComponent(token)}`;
    await this.page.goto(url);
  }

  /** Clicks the Accept CTA on the pending-invitation card. */
  public async accept(): Promise<void> {
    await this.acceptSubmit.click();
  }
}
