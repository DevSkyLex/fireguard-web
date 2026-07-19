import { expect, test, type Page } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * The equipment page's two maintenance surfaces: the fleet counters above the
 * table, and the per-asset maintenance column.
 *
 * Both read backend fields the frontend had never consumed, so this suite
 * exists mainly to pin the contract: a renamed key would leave the column
 * blank and the counters absent, which no unit test watching mocked inputs
 * would notice.
 */
const API_BASE_URL = process.env['E2E_API_BASE_URL'] ?? 'http://localhost:8000';

const equipment = (id: string, name: string, dueStatus: string) => ({
  '@id': `/api/equipment/${id}`,
  '@type': 'Equipment',
  id,
  organizationId: 'org',
  facilityId: null,
  type: name,
  subType: null,
  brand: null,
  model: null,
  serialNumber: null,
  locationLabel: null,
  status: 'operational',
  installedAt: null,
  commissionedAt: null,
  tags: [],
  createdAt: '2026-01-01T00:00:00+00:00',
  updatedAt: '2026-01-01T00:00:00+00:00',
  maintenanceDueStatus: dueStatus,
});

async function landOnEquipment(page: Page): Promise<void> {
  const organization = organizationOutput();
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [organization] });
  await api.mockOrganizationDetail(organization);
  await api.mockOrganizationAccess(organization.id);

  // Registered before the KPI route on purpose: Playwright matches handlers in
  // reverse registration order, so the broad `equipment**` pattern would swallow
  // `/equipment/kpis` if it came last.
  await page.route(`${API_BASE_URL}/api/organizations/${organization.id}/equipment**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({
        '@id': '/api/organizations/org/equipment',
        '@type': 'Collection',
        member: [
          equipment('e1', 'fire_extinguisher', 'overdue'),
          equipment('e2', 'smoke_detector', 'due_soon'),
          equipment('e3', 'sprinkler', 'up_to_date'),
          equipment('e4', 'hydrant', 'unscheduled'),
        ],
        totalItems: 4,
      }),
    }),
  );

  await page.route(`${API_BASE_URL}/api/organizations/${organization.id}/equipment/kpis`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({
        '@id': '/api/organizations/org/equipment/kpis',
        '@type': 'EquipmentKpi',
        totalAssets: 40,
        compliant: 28,
        dueSoon: 4,
        openNonConformities: 12,
      }),
    }),
  );

  await page.goto(`/organizations/${organization.id}/equipments`);
  await expect(page.locator('app-equipment-table')).toBeVisible();
}

test.describe('Equipment maintenance status', () => {
  test('names every maintenance state in the table', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnEquipment(page);

    const table = page.locator('app-equipment-table');

    // PRODUCT.md: status is never colour-only — each state carries its label.
    await expect(table).toContainText('Overdue');
    await expect(table).toContainText('Due soon');
    await expect(table).toContainText('Up to date');
    await expect(table).toContainText('Unscheduled');
  });

  test('summarises the fleet above the table', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnEquipment(page);

    const summary = page.locator('app-equipment-fleet-summary');

    await expect(summary).toContainText('40');
    await expect(summary).toContainText('28');
    await expect(summary).toContainText('4');

    // Organization-wide, not equipment-scoped — showing it here would mislead.
    await expect(summary).not.toContainText('12');
  });

  test('does not push the page sideways', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await landOnEquipment(page);

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );

    expect(overflows).toBe(false);
  });
});
