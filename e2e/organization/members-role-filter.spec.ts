import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { organizationQuotaOutput } from '../support/fixtures/billing-fixtures';
import { organizationMemberOutput } from '../support/fixtures/member-fixtures';
import {
  E2E_PERMISSION_CATALOG,
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
import { OrganizationTeamPage } from '../support/pages/organization-team.page';

/**
 * `OrganizationMemberListQuery.roleId` was served by the backend and serialized
 * by the service, and no caller ever sent it: "who holds this role" had no
 * answer, and `/team` and `/members` were two orthogonal cuts of the same
 * population with no bridge between them.
 *
 * The roster's initial load is a `forkJoin` over members + invitations + roles,
 * so a spec that mocks only two of the three gets an empty roles list and no
 * role filter at all — not a projection bug, an unmocked sibling request.
 */

const SCREENSHOT_DIR =
  'C:/Users/valen/AppData/Local/Temp/claude/G--Projets-fireguard-fireguard-sso-web/a35735d3-97bd-4e28-99cd-082456b11e86/scratchpad/screenshots';

const CUSTOM_ROLE = { ...organizationRoleOutput(), memberCount: 3 };

async function mockRoster(api: ApiMock): Promise<void> {
  await api.mockAuthenticatedSession();
  await api.mockOrganizationQuota(E2E_ORGANIZATION_ID, organizationQuotaOutput());
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, [organizationMemberOutput()]);
  await api.mockOrganizationInvitations(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationRoles(E2E_ORGANIZATION_ID, [
    ownerOrganizationRoleOutput(),
    CUSTOM_ROLE,
  ]);
}

async function gotoNarrowed(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/members?roleId=${CUSTOM_ROLE.id}`);
}

test.describe('Members narrowed by role', () => {
  test('sends roleId on the wire when the URL carries it', async ({ page }) => {
    const memberRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/members?') || request.url().endsWith('/members'))
        memberRequests.push(request.url());
    });

    const api = new ApiMock(page);
    await mockRoster(api);

    await gotoNarrowed(page);
    await expect(new OrganizationMembersPage(page).memberTable).toBeVisible();

    expect(
      memberRequests.some((url) => url.includes(`roleId=${CUSTOM_ROLE.id}`)),
      memberRequests.join('\n'),
    ).toBe(true);
  });

  test('narrows and widens the roster from the toolbar select', async ({ page }) => {
    const api = new ApiMock(page);
    await mockRoster(api);

    const members = new OrganizationMembersPage(page);
    await members.goto(E2E_ORGANIZATION_ID);

    const filter = page.getByTestId('organization-members-role-filter');
    await expect(filter).toBeVisible();
    await filter.click();
    await page.getByRole('option', { name: CUSTOM_ROLE.name }).click();

    await expect(page).toHaveURL(new RegExp(`roleId=${CUSTOM_ROLE.id}`));
  });

  test("links a role card's member count to the roster narrowed to it", async ({ page }) => {
    const api = new ApiMock(page);
    await mockRoster(api);

    await api.mockOrganizationPermissions(E2E_ORGANIZATION_ID, E2E_PERMISSION_CATALOG);

    const team = new OrganizationTeamPage(page);
    await team.goto(E2E_ORGANIZATION_ID);

    const count = page.getByTestId('organization-role-grid-card-member-count').first();
    await expect(count).toBeVisible();
    await count.click();

    await expect(page).toHaveURL(/\/members\?roleId=/);
  });

  test('renders the narrowed roster at 375px in dark mode', async ({ page, context, baseURL }) => {
    const consoleErrors = collectConsoleErrors(page);
    await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await page.setViewportSize({ width: 375, height: 800 });

    const api = new ApiMock(page);
    await mockRoster(api);

    const members = new OrganizationMembersPage(page);
    await gotoNarrowed(page);

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(members.root).toBeVisible();
    await expect(page.getByTestId('organization-members-role-filter')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: SCREENSHOT_DIR + '/members-role-filter-dark-375.png' });
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });

  test('renders the narrowed roster at 1280px in light mode', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    const api = new ApiMock(page);
    await mockRoster(api);

    const members = new OrganizationMembersPage(page);
    await gotoNarrowed(page);

    await expect(members.root).toBeVisible();
    await expect(page.getByTestId('organization-members-role-filter')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: SCREENSHOT_DIR + '/members-role-filter-light-1280.png' });
  });
});
