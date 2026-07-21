import { expect, test, type Page } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * The compliance register (`/compliance`).
 *
 * Covers the two things the page exists to get right: that a site tracking
 * nothing reads as unmeasured rather than as 0% compliant, and that the two
 * sections live in the URL so a view can be shared.
 */
const API_BASE_URL = process.env['E2E_API_BASE_URL'] ?? 'http://localhost:8000';

const facility = (
  facilityId: string,
  name: string,
  complianceRate: number | null,
  overdue: number,
  critical: number,
  lastInspectionAt: string | null,
) => ({
  facilityId,
  name,
  type: 'site',
  parentFacilityId: null,
  path: name,
  status: 'active',
  totalEquipmentCount: 20,
  activeEquipmentCount: 18,
  upToDateEquipmentCount: 14,
  dueSoonEquipmentCount: 2,
  overdueEquipmentCount: overdue,
  unscheduledEquipmentCount: 2,
  trackedEquipmentCount: complianceRate === null ? 0 : 16,
  complianceRate,
  openLowNonConformityCount: 1,
  openMediumNonConformityCount: 2,
  openHighNonConformityCount: 1,
  openCriticalNonConformityCount: critical,
  lastInspectionAt,
});

const summary = {
  '@id': '/api/organizations/org/compliance',
  '@type': 'ComplianceSummary',
  organizationStatus: 'active',
  totals: {
    totalEquipmentCount: 40,
    trackedEquipmentCount: 32,
    upToDateEquipmentCount: 28,
    dueSoonEquipmentCount: 3,
    overdueEquipmentCount: 1,
    unscheduledEquipmentCount: 8,
    complianceRate: 87.5,
    openCriticalNonConformityCount: 2,
    openHighNonConformityCount: 1,
    openMediumNonConformityCount: 4,
    openLowNonConformityCount: 3,
  },
  facilities: [
    facility('f1', 'Northgate Plant', 94.2, 0, 0, '2026-06-01T00:00:00+00:00'),
    facility('f2', 'Riverside Depot', null, 0, 0, null),
    facility('f3', 'Southbank Works', 42, 5, 2, '2026-02-14T00:00:00+00:00'),
  ],
};

async function landOnCompliance(page: Page, tab?: string): Promise<void> {
  const organization = organizationOutput();
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [organization] });
  await api.mockOrganizationDetail(organization);
  await api.mockOrganizationAccess(organization.id);

  await page.route(`${API_BASE_URL}/api/organizations/${organization.id}/compliance`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify(summary),
    }),
  );

  const query: string = tab === undefined ? '' : `?tab=${tab}`;
  await page.goto(`/organizations/${organization.id}/compliance${query}`);
  await expect(page.locator('#compliance')).toBeVisible();
}

test.describe('Compliance register', () => {
  test('opens on the coverage rollup', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnCompliance(page);

    const page_ = page.locator('#compliance');

    await expect(page_).toContainText('88%');
    await expect(page_).toContainText('32');
    await expect(page_).toContainText('10'); // 2 + 1 + 4 + 3 open non-conformities
  });

  test('keeps the section in the URL so a view can be shared', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnCompliance(page);

    await page.getByRole('tab', { name: 'By site' }).click();

    await expect(page).toHaveURL(/tab=sites/);
    await expect(page.locator('app-compliance-facility-table')).toBeVisible();
  });

  // The backend returns a null rate for a site tracking nothing and is explicit
  // that this is "undefined, NOT 0%".
  test('shows an untracked site as unmeasured, not as zero percent', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnCompliance(page, 'sites');

    const depot = page.locator('tr', { hasText: 'Riverside Depot' });

    await expect(depot).toContainText('—');
    await expect(depot).not.toContainText('0%');
  });

  // Worst first: the site needing attention must not be buried under healthy ones.
  test('leads with the worst-covered site', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnCompliance(page, 'sites');

    const firstRow = page.locator('app-compliance-facility-table tbody tr').first();

    await expect(firstRow).toContainText('Southbank Works');
  });

  test('keeps an untracked site last rather than treating it as failing', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnCompliance(page, 'sites');

    const lastRow = page.locator('app-compliance-facility-table tbody tr').last();

    await expect(lastRow).toContainText('Riverside Depot');
  });

  // Eleven sibling tables carry a pager; the estate list was the only one that
  // scrolled forever. It paginates client-side because the rows arrive whole.
  test('paginates the estate list once it outgrows a page', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const organization = organizationOutput();
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });
    await api.mockOrganizationDetail(organization);
    await api.mockOrganizationAccess(organization.id);

    const many = Array.from({ length: 24 }, (_, index) =>
      facility(`f${index}`, `Site ${index}`, 90, 0, 0, '2026-06-01T00:00:00+00:00'),
    );
    await page.route(`${API_BASE_URL}/api/organizations/${organization.id}/compliance`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify({ ...summary, facilities: many }),
      }),
    );

    await page.goto(`/organizations/${organization.id}/compliance?tab=sites`);

    const table = page.locator('app-compliance-facility-table');
    await expect(table.locator('p-paginator')).toBeVisible();
    // Ten rows on screen, not twenty-four.
    await expect(table.locator('tbody tr')).toHaveCount(10);
  });

  // Three sites fit; a pager there would be chrome with nothing to do.
  test('shows no pager when everything fits on one page', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await landOnCompliance(page, 'sites');

    const table = page.locator('app-compliance-facility-table');
    await expect(table).toBeVisible();
    await expect(table.locator('p-paginator')).toHaveCount(0);
  });
});
