import { expect, test } from '@playwright/test';
import {
  ALL_ORGANIZATION_PERMISSIONS,
  E2E_ORGANIZATION_ID,
  organizationOutput,
} from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { AccountOrganizationsPage } from '../support/pages/account-organizations.page';

/**
 * Every catalog permission but `organization.settings.write` and
 * `organization.delete` — the two that gate the settings danger-tab route
 * and its tab. A rank-and-file member holding this set has no organization
 * permission left that would reach the danger tab, yet still owns an
 * active membership: the only floor `LeaveOrganizationProcessor` checks, and
 * the one `/account/organizations` is built to be reachable regardless of.
 */
const PLAIN_MEMBER_PERMISSIONS: ReadonlyArray<string> = ALL_ORGANIZATION_PERMISSIONS.filter(
  (permission) =>
    permission !== 'organization.settings.write' && permission !== 'organization.delete',
);

test.describe('Account organizations — leave organization', () => {
  test('lets a member without settings.write or delete leave from their own organizations list', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({
      organizations: [organizationOutput({ ownerUserId: 'e2e-owner-1' })],
    });
    await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
      permissions: PLAIN_MEMBER_PERMISSIONS,
      roles: [{ id: 'e2e-role-member', name: 'Member' }],
    });
    await api.mockOrganizationMemberLeave(E2E_ORGANIZATION_ID);

    const accountOrganizations = new AccountOrganizationsPage(page);
    await accountOrganizations.goto();

    await accountOrganizations.startLeaving('E2E Organization');

    await expect(accountOrganizations.leaveDialog).toBeVisible();
    await expect(accountOrganizations.leaveDialog).toContainText('E2E Organization');

    const leaveRequest = page.waitForRequest(
      (request) => request.method() === 'DELETE' && request.url().includes('/members/me'),
    );
    await accountOrganizations.confirmLeave();
    await leaveRequest;

    await expect(accountOrganizations.leaveDialog).toBeHidden();
  });

  test("surfaces the backend's last-administrator refusal inline instead of failing silently", async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({
      organizations: [organizationOutput({ ownerUserId: 'e2e-owner-1' })],
    });
    await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
      permissions: PLAIN_MEMBER_PERMISSIONS,
      roles: [{ id: 'e2e-role-member', name: 'Member' }],
    });
    await api.mockOrganizationMemberLeaveError(E2E_ORGANIZATION_ID, {
      detail: 'Cannot remove the last administrator of the organization.',
    });

    const accountOrganizations = new AccountOrganizationsPage(page);
    await accountOrganizations.goto();

    await accountOrganizations.startLeaving('E2E Organization');
    await accountOrganizations.confirmLeave();

    await expect(accountOrganizations.leaveErrorMessage).toHaveText(
      'Cannot remove the last administrator of the organization.',
    );
    await expect(accountOrganizations.leaveDialog).toBeVisible();
  });
});
