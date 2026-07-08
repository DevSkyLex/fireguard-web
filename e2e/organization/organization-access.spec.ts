import { expect, test } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { OrganizationOverviewPage } from '../support/pages/organization-overview.page';

/**
 * Organization detail access control — `/organizations/:organizationId/*`
 * (`organizationAccessGuard`, `organizationLandingGuard`,
 * `organizationPermissionGuard`, `src/app/features/organization`).
 *
 * Scoped to guard/routing behavior driven by the
 * `GET /api/organizations/{id}/me` access payload. The permission-gated
 * pages themselves (members, team, settings) call further endpoints of
 * their own (member/invitation lists, roles, quota, ...) intentionally left
 * unmocked here — see `e2e/README.md`.
 */
test.describe('Organization access control', () => {
  const organization = organizationOutput();

  test('lands on the overview when the dashboard permission is granted', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });
    await api.mockOrganizationDetail(organization);
    await api.mockOrganizationAccess(organization.id);

    const overviewPage = new OrganizationOverviewPage(page);
    await overviewPage.goto(organization.id);

    await expect(page).toHaveURL(`/organizations/${organization.id}`);
    await expect(overviewPage.root).toBeVisible();
  });

  test('redirects to the organization list when the member access payload fails to resolve', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });
    await api.mockOrganizationDetail(organization);
    await page.route(
      `http://localhost:8000/api/organizations/${organization.id}/me`,
      async (route) => {
        await route.fulfill({ status: 403, contentType: 'application/ld+json', body: '{}' });
      },
    );

    await page.goto(`/organizations/${organization.id}`);

    await expect(page).toHaveURL('/organizations');
  });

  const permissionGatedPages: ReadonlyArray<{ path: string; rootSelector: string }> = [
    { path: 'members', rootSelector: '#organization-members' },
    { path: 'team', rootSelector: '#organization-team' },
    { path: 'settings', rootSelector: '#organization-settings' },
  ];

  for (const { path, rootSelector } of permissionGatedPages) {
    test(`grants access to /${path} when its permissions are present`, async ({ page }) => {
      const api = new ApiMock(page);
      await api.mockAuthenticatedSession({ organizations: [organization] });
      await api.mockOrganizationDetail(organization);
      await api.mockOrganizationAccess(organization.id);

      await page.goto(`/organizations/${organization.id}/${path}`);

      await expect(page.locator(rootSelector)).toBeVisible();
    });
  }

  test('redirects to the organization list when a permission is missing', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });
    await api.mockOrganizationDetail(organization);
    await api.mockOrganizationAccess(organization.id, {
      permissions: ['organization.dashboard.read'],
    });

    await page.goto(`/organizations/${organization.id}/settings`);

    await expect(page).toHaveURL('/organizations');
  });
});
