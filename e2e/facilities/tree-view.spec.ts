import { expect, test, type Page } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * The facility hierarchy view (`/facilities?view=tree`).
 *
 * PrimeNG's TreeTable is the reason this suite exists: its togglers, nesting and
 * row rendering do not behave in jsdom, so the unit specs deliberately stop at
 * the node mapping. Whether the estate actually draws — and whether a member
 * without `compliance.read` is handed the list instead — can only be seen in a
 * real browser.
 */
const API_BASE_URL = process.env['E2E_API_BASE_URL'] ?? 'http://localhost:8000';

const node = (
  id: string,
  name: string,
  type: string,
  equipmentCount: number,
  complianceRate: number | null,
  children: unknown[] = [],
) => ({
  id,
  name,
  type,
  parentFacilityId: null,
  equipmentCount,
  status: 'active',
  complianceRate,
  children,
});

const tree = {
  '@id': '/api/organizations/org/facility-tree',
  '@type': 'FacilityTree',
  nodes: [
    node('s1', 'Northgate Plant', 'site', 84, 93.4, [
      node('b1', 'Assembly Hall', 'building', 41, 88.1, [
        node('f1', 'Ground Floor', 'floor', 22, 71.2),
        node('f2', 'Mezzanine', 'floor', 19, 45),
      ]),
      node('b2', 'Warehouse B', 'building', 43, 99, []),
    ]),
    node('s2', 'Riverside Depot', 'site', 12, null, []),
  ],
};

async function landOnTree(page: Page): Promise<void> {
  const organization = organizationOutput();
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [organization] });
  await api.mockOrganizationDetail(organization);
  await api.mockOrganizationAccess(organization.id);

  await page.route(
    `${API_BASE_URL}/api/organizations/${organization.id}/facility-tree**`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify(tree),
      }),
  );

  await page.goto(`/organizations/${organization.id}/facilities?view=tree`);
  await expect(page.locator('app-facility-tree-table')).toBeVisible();
}

test.describe('Facility hierarchy', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`draws the estate without overflowing — ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await landOnTree(page);

      if (theme === 'dark') {
        await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      }

      // Roots expand, so their buildings are on screen without a click.
      await expect(page.getByText('Northgate Plant')).toBeVisible();
      await expect(page.getByText('Assembly Hall')).toBeVisible();

      // The floors sit one level deeper and stay collapsed.
      await expect(page.getByText('Ground Floor')).toBeHidden();

      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflows).toBe(false);
    });
  }

  // Finding one room in an estate meant expanding every branch. The filter
  // keeps the ancestors of each match — a room without its site is unplaceable.
  test('filters the hierarchy while keeping the ancestors of each match', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnTree(page);

    await page.getByTestId('collection-toolbar-search').fill('Mezzanine');

    await expect(page.getByText('Mezzanine')).toBeVisible();
    // Kept because the match sits under them.
    await expect(page.getByText('Northgate Plant')).toBeVisible();
    await expect(page.getByText('Assembly Hall')).toBeVisible();
    // No match anywhere beneath it.
    await expect(page.getByText('Riverside Depot')).toHaveCount(0);
  });

  // Creation lived inside the list's table only, so the hierarchy offered no
  // way to add a site without switching views first.
  test('offers the create action from the hierarchy', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnTree(page);

    await expect(page.getByTestId('facility-tree-create')).toBeVisible();
  });

  test('opens a collapsed level on demand', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnTree(page);

    await page.locator('p-treetabletoggler button').nth(1).click();

    await expect(page.getByText('Ground Floor')).toBeVisible();
    await expect(page.getByText('Mezzanine')).toBeVisible();
  });

  // "0%" and "nothing tracked yet" are different facts; a depot with no tracked
  // equipment must not read as fully non-compliant.
  test('shows an untracked site as a dash, not a zero', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnTree(page);

    const depotRow = page.locator('tr', { hasText: 'Riverside Depot' });

    await expect(depotRow).toContainText('—');
    await expect(depotRow).not.toContainText('0%');
  });

  // The hierarchy needs `compliance.read`; the list needs only `facilities.read`.
  // A shared ?view=tree link must degrade, never 403.
  test('falls back to the list for a member without compliance.read', async ({ page }) => {
    const organization = organizationOutput();
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });
    await api.mockOrganizationDetail(organization);
    await api.mockOrganizationAccess(organization.id, {
      permissions: ['organization.read', 'organization.facilities.read'],
    });

    await page.goto(`/organizations/${organization.id}/facilities?view=tree`);

    await expect(page.locator('app-facility-table')).toBeVisible();
    await expect(page.locator('app-facility-tree-table')).toHaveCount(0);
    await expect(page.locator('p-selectbutton')).toHaveCount(0);
  });
});
