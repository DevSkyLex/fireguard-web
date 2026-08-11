import type { Locator, Page } from '@playwright/test';

/**
 * Page object OrganizationMembersPage
 *
 * @description
 * Wraps the members route (`/organizations/:organizationId/members`) behind
 * named locators and one method per user intent: the roster, the
 * pending-invitations grid, the invite dialog, the role-assignment dialog and
 * the remove confirmation.
 */
export class OrganizationMembersPage {
  public constructor(private readonly page: Page) {}

  public readonly root: Locator = this.page.locator('#organization-members');
  public readonly inviteButton: Locator = this.page.getByTestId('organization-members-invite');
  public readonly rowCount: Locator = this.page.getByTestId('organization-members-row-count');
  public readonly memberTable: Locator = this.page.getByTestId('organization-member-table');
  public readonly memberRows: Locator = this.page.getByTestId('organization-member-table-row');
  public readonly memberRowRolesTrigger: Locator = this.page.getByTestId(
    'organization-member-table-row-roles',
  );
  public readonly memberRowRemoveTrigger: Locator = this.page.getByTestId(
    'organization-member-table-row-remove',
  );
  public readonly invitationTable: Locator = this.page.getByTestId('organization-invitation-table');
  public readonly invitationRows: Locator = this.page.getByTestId(
    'organization-invitation-table-row',
  );
  public readonly inviteDialog: Locator = this.page.getByTestId('organization-invite-dialog');
  public readonly rolesDialog: Locator = this.page.getByTestId('organization-member-roles-dialog');
  public readonly removeDialog: Locator = this.page.getByTestId(
    'organization-members-remove-dialog',
  );
  public readonly removeConfirm: Locator = this.page.getByTestId(
    'organization-members-remove-confirm',
  );

  public async goto(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/members`);
  }

  /** Opens the invite dialog from the header action. */
  public async openInviteDialog(): Promise<void> {
    await this.inviteButton.click();
  }

  /** Opens a member row's overflow menu, then its role-assignment entry. */
  public async openRolesDialogForRow(rowIndex: number = 0): Promise<void> {
    await this.memberRows.nth(rowIndex).getByTestId('organization-member-table-row-menu').click();
    await this.memberRowRolesTrigger.click();
  }

  /** Opens a member row's overflow menu, then its Remove entry. */
  public async requestRemoveForRow(rowIndex: number = 0): Promise<void> {
    await this.memberRows.nth(rowIndex).getByTestId('organization-member-table-row-menu').click();
    await this.memberRowRemoveTrigger.click();
  }
}
