import type { Locator, Page } from '@playwright/test';

/**
 * Page object OrganizationTeamPage
 *
 * @description
 * Wraps the retired `/organizations/:organizationId/team` route, which
 * redirects functionally onto `OrganizationMembersPage`'s `?tab=roles` tab —
 * still rendered under its own `#organization-team` root — behind named
 * locators and one method per user intent: the role grid, the create-role
 * dialog, the permissions sheet and the delete confirmation.
 */
export class OrganizationTeamPage {
  public constructor(private readonly page: Page) {}

  public readonly root: Locator = this.page.locator('#organization-team');
  public readonly createRoleButton: Locator = this.page.getByTestId(
    'organization-team-create-role',
  );
  public readonly roleGrid: Locator = this.page.getByTestId('organization-role-grid');
  public readonly roleCards: Locator = this.page.getByTestId('organization-role-grid-card');
  public readonly roleCardMenu: Locator = this.page.getByTestId('organization-role-grid-card-menu');
  public readonly roleCardEditPermissions: Locator = this.page.getByTestId(
    'organization-role-grid-card-edit-permissions',
  );
  public readonly roleCardDelete: Locator = this.page.getByTestId(
    'organization-role-grid-card-delete',
  );
  public readonly createDialog: Locator = this.page.getByTestId('organization-role-create-dialog');
  public readonly permissionsSheet: Locator = this.page.getByTestId(
    'organization-role-permissions-sheet',
  );
  public readonly permissionCheckboxes: Locator = this.page.getByTestId(
    'organization-role-permission',
  );
  public readonly deleteDialog: Locator = this.page.getByTestId('organization-team-delete-dialog');
  public readonly deleteConfirm: Locator = this.page.getByTestId(
    'organization-team-delete-confirm',
  );

  public async goto(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/team`);
  }

  /** Opens the create-role dialog from the header action. */
  public async openCreateDialog(): Promise<void> {
    await this.createRoleButton.click();
  }

  /** Opens a role card's overflow menu, then its Edit permissions entry. */
  public async openPermissionsEditorForCard(cardIndex: number = 0): Promise<void> {
    await this.roleCards.nth(cardIndex).getByTestId('organization-role-grid-card-menu').click();
    await this.roleCardEditPermissions.click();
  }

  /** Opens a role card's overflow menu, then its Delete entry. */
  public async requestDeleteForCard(cardIndex: number = 0): Promise<void> {
    await this.roleCards.nth(cardIndex).getByTestId('organization-role-grid-card-menu').click();
    await this.roleCardDelete.click();
  }
}
