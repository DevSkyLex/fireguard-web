import { expect, test } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * Settings became a tab shell whose tabs are real child routes, and members,
 * roles and the audit log moved underneath it.
 *
 * The parent route deliberately carries no permission guard. Had it kept the
 * `SETTINGS_WRITE` it used to have, folding the other three underneath would
 * have silently revoked the members list from everyone holding only
 * `MEMBERS_READ`, and the audit log from holders of the platform-wide
 * `audit.read`. That is a security regression, not a layout detail — hence a
 * matrix rather than a smoke test.
 */
test.describe('Organization settings access', () => {
  const organization = organizationOutput();

  const READ_ONLY = 'organization.dashboard.read';

  // One case per (persona, tab) pair rather than a loop inside a test: a page
  // cannot navigate in parallel, so an in-test loop would have to be
  // sequential — and a failure would not say which tab broke.
  const matrix: ReadonlyArray<{
    readonly persona: string;
    readonly permissions: readonly string[];
    readonly path: string;
    readonly allowed: boolean;
  }> = [
    {
      persona: 'members-only',
      permissions: [READ_ONLY, 'organization.members.read'],
      path: 'settings/members',
      allowed: true,
    },
    {
      persona: 'members-only',
      permissions: [READ_ONLY, 'organization.members.read'],
      path: 'settings/general',
      allowed: false,
    },
    {
      persona: 'roles-only',
      permissions: [READ_ONLY, 'organization.roles.read'],
      path: 'settings/roles',
      allowed: true,
    },
    {
      persona: 'roles-only',
      permissions: [READ_ONLY, 'organization.roles.read'],
      path: 'settings/general',
      allowed: false,
    },
    {
      persona: 'roles-only',
      permissions: [READ_ONLY, 'organization.roles.read'],
      path: 'settings/members',
      allowed: false,
    },
    {
      persona: 'settings-only',
      permissions: [READ_ONLY, 'organization.settings.write'],
      path: 'settings/general',
      allowed: true,
    },
    {
      persona: 'settings-only',
      permissions: [READ_ONLY, 'organization.settings.write'],
      path: 'settings/members',
      allowed: false,
    },
    {
      persona: 'settings-only',
      permissions: [READ_ONLY, 'organization.settings.write'],
      path: 'settings/roles',
      allowed: false,
    },
  ];

  for (const { persona, permissions, path, allowed } of matrix) {
    const verb: string = allowed ? 'reaches' : 'cannot reach';

    test(`a ${persona} member ${verb} /${path}`, async ({ page }) => {
      const api = new ApiMock(page);
      await api.mockAuthenticatedSession({ organizations: [organization] });
      await api.mockOrganizationDetail(organization);
      await api.mockOrganizationAccess(organization.id, { permissions: [...permissions] });
      const target = `/organizations/${organization.id}/${path}`;

      await page.goto(target);

      if (allowed) {
        await expect(page).toHaveURL(target);
      } else {
        await expect(page).not.toHaveURL(target);
      }
    });
  }

  test('lands a bare /settings on the first tab the member can open', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });
    await api.mockOrganizationDetail(organization);
    await api.mockOrganizationAccess(organization.id, {
      permissions: ['organization.dashboard.read', 'organization.members.read'],
    });

    await page.goto(`/organizations/${organization.id}/settings`);

    // `general` comes first in the tab order but needs SETTINGS_WRITE.
    await expect(page).toHaveURL(`/organizations/${organization.id}/settings/members`);
  });

  const legacy: ReadonlyArray<readonly [string, string]> = [
    ['members', 'settings/members'],
    ['team', 'settings/roles'],
    ['audit', 'settings/audit'],
  ];

  for (const [from, to] of legacy) {
    test(`keeps the bookmark /${from} working`, async ({ page }) => {
      const api = new ApiMock(page);
      // `audit.read` is an ACCOUNT permission, not organization RBAC — granting
      // every organization permission does not grant it, which is exactly why
      // the audit tab keeps its own `accountPermissionGuard`.
      await api.mockAuthenticatedSession({
        organizations: [organization],
        profile: { permissions: ['audit.read'] },
      });
      await api.mockOrganizationDetail(organization);
      await api.mockOrganizationAccess(organization.id);

      await page.goto(`/organizations/${organization.id}/${from}`);

      await expect(page).toHaveURL(`/organizations/${organization.id}/${to}`);
    });
  }

  test('keeps the audit tab out of reach without the account permission', async ({ page }) => {
    const api = new ApiMock(page);
    // Every organization permission, but no `audit.read`.
    await api.mockAuthenticatedSession({ organizations: [organization] });
    await api.mockOrganizationDetail(organization);
    await api.mockOrganizationAccess(organization.id);

    await page.goto(`/organizations/${organization.id}/settings/audit`);

    await expect(page).not.toHaveURL(`/organizations/${organization.id}/settings/audit`);
  });
});
