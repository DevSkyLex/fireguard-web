import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { organizationQuotaOutput } from '../support/fixtures/billing-fixtures';
import {
  inspectorOrganizationMemberOutput,
  organizationInvitationOutput,
  organizationMemberOutput,
} from '../support/fixtures/member-fixtures';
import {
  organizationRoleOutput,
  ownerOrganizationRoleOutput,
} from '../support/fixtures/role-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { OrganizationMembersPage } from '../support/pages/organization-members.page';

const SCREENSHOT_DIR =
  'C:/Users/valen/AppData/Local/Temp/claude/G--Projets-fireguard/92f41712-7d5f-443b-af9a-18c346a39be0/scratchpad/screenshots';

test.describe('Organization members', () => {
  test('renders the roster and the pending-invitations grid for a permission-holding member', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationQuota(E2E_ORGANIZATION_ID, organizationQuotaOutput());
    await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, [
      organizationMemberOutput(),
      inspectorOrganizationMemberOutput(),
    ]);
    await api.mockOrganizationInvitations(E2E_ORGANIZATION_ID, [organizationInvitationOutput()]);
    await api.mockOrganizationRoles(E2E_ORGANIZATION_ID, [
      ownerOrganizationRoleOutput(),
      organizationRoleOutput(),
    ]);
    const members = new OrganizationMembersPage(page);

    await members.goto(E2E_ORGANIZATION_ID);

    await expect(members.root).toBeVisible();
    await expect(members.inviteButton).toBeVisible();
    await expect(members.memberTable).toBeVisible();
    await expect(members.memberRows).toHaveCount(2);
    await expect(members.rowCount).toHaveText('2 of 2 row(s) shown');
    await expect(members.invitationTable).toBeVisible();
    await expect(members.invitationRows).toHaveCount(1);
  });

  test('opens the invite dialog and the role-assignment dialog', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationQuota(E2E_ORGANIZATION_ID, organizationQuotaOutput());
    await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, [organizationMemberOutput()]);
    await api.mockOrganizationInvitations(E2E_ORGANIZATION_ID, []);
    await api.mockOrganizationRoles(E2E_ORGANIZATION_ID, [ownerOrganizationRoleOutput()]);
    const members = new OrganizationMembersPage(page);

    await members.goto(E2E_ORGANIZATION_ID);
    await expect(members.memberRows).toHaveCount(1);

    await members.openInviteDialog();
    await expect(members.inviteDialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(members.inviteDialog).toBeHidden();

    await members.openRolesDialogForRow();
    await expect(members.rolesDialog).toBeVisible();
  });

  test('hides invite, roster actions and the pending-invitations grid without members.manage', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationQuota(E2E_ORGANIZATION_ID, organizationQuotaOutput());
    await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
      permissions: ['organization.members.read'],
    });
    await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, [organizationMemberOutput()]);
    const members = new OrganizationMembersPage(page);

    await members.goto(E2E_ORGANIZATION_ID);

    await expect(members.memberRows).toHaveCount(1);
    await expect(members.inviteButton).toHaveCount(0);
    await expect(members.invitationTable).toHaveCount(0);
  });

  test('renders at 375px in dark mode with no console errors and no horizontal overflow', async ({
    page,
    context,
    baseURL,
  }) => {
    const consoleErrors = collectConsoleErrors(page);
    await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await page.setViewportSize({ width: 375, height: 800 });

    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationQuota(E2E_ORGANIZATION_ID, organizationQuotaOutput());
    await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, [
      organizationMemberOutput(),
      inspectorOrganizationMemberOutput(),
    ]);
    await api.mockOrganizationInvitations(E2E_ORGANIZATION_ID, [organizationInvitationOutput()]);
    await api.mockOrganizationRoles(E2E_ORGANIZATION_ID, [ownerOrganizationRoleOutput()]);
    const members = new OrganizationMembersPage(page);

    await members.goto(E2E_ORGANIZATION_ID);

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(members.root).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/members-dark-mobile.png` });
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });

  test('changes the roster page size and re-requests the roster at the new size', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationQuota(E2E_ORGANIZATION_ID, organizationQuotaOutput());
    await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, [
      organizationMemberOutput(),
      inspectorOrganizationMemberOutput(),
    ]);
    await api.mockOrganizationInvitations(E2E_ORGANIZATION_ID, []);
    await api.mockOrganizationRoles(E2E_ORGANIZATION_ID, [ownerOrganizationRoleOutput()]);
    const members = new OrganizationMembersPage(page);

    await members.goto(E2E_ORGANIZATION_ID);
    await expect(members.memberRows).toHaveCount(2);
    await expect(members.pageSizeTrigger).toHaveText('30');

    const requestPromise = page.waitForRequest((request) =>
      /\/api\/organizations\/[^/]+\/members\?.*itemsPerPage=60/.test(request.url()),
    );
    await members.choosePageSize(60);
    const request = await requestPromise;

    expect(request.url()).toContain('page=1');
    await expect(members.pageSizeTrigger).toHaveText('60');
  });

  test('renders on desktop in light mode', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationQuota(E2E_ORGANIZATION_ID, organizationQuotaOutput());
    await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, [
      organizationMemberOutput(),
      inspectorOrganizationMemberOutput(),
    ]);
    await api.mockOrganizationInvitations(E2E_ORGANIZATION_ID, [organizationInvitationOutput()]);
    await api.mockOrganizationRoles(E2E_ORGANIZATION_ID, [ownerOrganizationRoleOutput()]);
    const members = new OrganizationMembersPage(page);

    await members.goto(E2E_ORGANIZATION_ID);

    await expect(members.root).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/members-light-desktop.png` });
  });
});
