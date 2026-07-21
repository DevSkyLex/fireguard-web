import { expect, test } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * The facility detail header band.
 *
 * `FacilityOverviewStore` computed every one of these figures — including the
 * presentation-ready `complianceDisplay` and `equipmentDescription` — and no
 * template read any of them. The band is also what removed a duplicated
 * inspections list: the page rendered the same four rows twice, which only a
 * rendered page shows.
 */

const ORG = organizationOutput();

const facility = {
  '@id': '/api/facilities/f-root',
  '@type': 'Facility',
  id: 'f-root',
  organizationId: ORG.id,
  parentFacilityId: null,
  hasChildren: false,
  type: 'site',
  name: 'Northgate Plant',
  code: 'SITE-001',
  status: 'active',
  address: '12 rue de la Paix',
  latitude: null,
  longitude: null,
  metadata: {},
  equipmentCount: 41,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const inspection = (id: string, result: string, performedAt: string, status = 'closed') => ({
  '@id': `/api/inspections/${id}`,
  '@type': 'Inspection',
  id,
  organizationId: ORG.id,
  equipmentId: 'eq-1',
  facilityId: 'f-root',
  result,
  status,
  performedAt,
  checklistId: null,
  notes: null,
  signature: null,
  nonConformitiesCount: 0,
  createdAt: performedAt,
  updatedAt: performedAt,
});

async function landOnFacility(page: import('@playwright/test').Page): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [ORG] });
  await api.mockOrganizationDetail(ORG);
  await api.mockOrganizationAccess(ORG.id);

  await page.route(/\/facilities\/f-root\/inspections(\?.*)?$/, (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({
        member: [
          inspection('i1', 'pass', '2026-05-01T10:00:00Z'),
          inspection('i2', 'pass', '2026-06-01T10:00:00Z'),
          inspection('i3', 'fail', '2026-07-01T10:00:00Z', 'submitted'),
          inspection('i4', 'pass', '2026-09-15T10:00:00Z', 'draft'),
        ],
        totalItems: 4,
      }),
    }),
  );
  await page.route(/\/facilities\/f-root\/equipment(\?.*)?$/, (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({ member: [], totalItems: 0 }),
    }),
  );
  await page.route(/\/facilities\/f-root\/descendants(\?.*)?$/, (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({ member: [], totalItems: 0 }),
    }),
  );
  await page.route(/\/api\/organizations\/[^/]+\/facilities\/f-root(\?.*)?$/, (r) =>
    r.fulfill({ status: 200, contentType: 'application/ld+json', body: JSON.stringify(facility) }),
  );

  await page.goto(`/organizations/${ORG.id}/facilities/f-root`);
  await expect(page.getByTestId('facility-kpi-strip')).toBeVisible();
}

test.describe('Facility KPI strip', () => {
  test('states the four figures the store already computed', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await landOnFacility(page);

    const cells = page.getByTestId('facility-kpi-cell');
    await expect(cells).toHaveCount(4);

    // 3 passes out of 4 inspections.
    await expect(cells.nth(0)).toContainText('75%');
    // One inspection is past its date and not closed.
    await expect(cells.nth(2)).toContainText('1');
    await expect(cells.nth(2)).toContainText('needs attention');
    // The only future inspection is 2026-09-15.
    await expect(cells.nth(3)).toContainText('d');
  });

  // A facility with no inspection has no rate. "0%" would read as "everything
  // failed", which is the opposite of "nothing measured yet".
  test('shows a dash rather than a zero when nothing has been inspected', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORG] });
    await api.mockOrganizationDetail(ORG);
    await api.mockOrganizationAccess(ORG.id);
    await page.route(/\/facilities\/f-root\/(inspections|equipment|descendants)(\?.*)?$/, (r) =>
      r.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify({ member: [], totalItems: 0 }),
      }),
    );
    await page.route(/\/api\/organizations\/[^/]+\/facilities\/f-root(\?.*)?$/, (r) =>
      r.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify(facility),
      }),
    );

    await page.goto(`/organizations/${ORG.id}/facilities/f-root`);

    const cells = page.getByTestId('facility-kpi-cell');
    await expect(cells.nth(0)).toContainText('—');
    await expect(cells.nth(0)).not.toContainText('0%');
    await expect(cells.nth(3)).toContainText('none scheduled');
  });

  // The page rendered app-facility-inspections-overview and the dataview one
  // after the other: the same four rows, the same filters, twice.
  test('lists the inspections once, not twice', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1400 });
    await landOnFacility(page);

    await expect(page.locator('app-facility-inspection-dataview')).toHaveCount(1);
    await expect(page.locator('app-facility-inspections-overview')).toHaveCount(0);
    // Four inspection rows on the page, not eight.
    await expect(page.getByText('Unknown inspector')).toHaveCount(4);
  });
});
