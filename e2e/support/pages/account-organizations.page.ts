import type { Locator, Page } from '@playwright/test';

/**
 * Page object AccountOrganizationsPage
 *
 * @description
 * Wraps `/account/organizations` — the caller's own organization memberships
 * list, each row's self-service "Leave" action, and the confirmation dialog
 * it opens.
 */
export class AccountOrganizationsPage {
  public constructor(private readonly page: Page) {}

  public readonly root: Locator = this.page.locator('#account-organizations');
  public readonly rows: Locator = this.page.getByTestId('account-organizations-row');
  public readonly leaveDialog: Locator = this.page.getByTestId('account-leave-organization-dialog');
  public readonly leaveConfirmButton: Locator = this.page.getByTestId(
    'account-leave-organization-confirm',
  );
  public readonly leaveErrorMessage: Locator = this.page.getByTestId(
    'account-leave-organization-error',
  );

  public async goto(): Promise<void> {
    await this.page.goto('/account/organizations');
  }

  /** Opens the leave confirmation for the row matching the given organization name. */
  public async startLeaving(organizationName: string): Promise<void> {
    await this.rows
      .filter({ hasText: organizationName })
      .getByTestId('account-organizations-leave-open')
      .click();
  }

  /** Confirms the open leave dialog. */
  public async confirmLeave(): Promise<void> {
    await this.leaveConfirmButton.click();
  }
}
