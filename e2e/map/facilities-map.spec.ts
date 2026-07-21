import { expect, test, type Page } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * The facilities map (`/map`).
 *
 * MapLibre does not render in jsdom, so this is the only place the map is
 * exercised at all — and the only place the "drop facilities without
 * coordinates" rule can be checked end to end.
 */
const API_BASE_URL = process.env['E2E_API_BASE_URL'] ?? 'http://localhost:8000';

const facility = (
  id: string,
  name: string,
  latitude: number | null,
  longitude: number | null,
  extra: Record<string, unknown> = {},
) => ({
  '@id': `/api/facilities/${id}`,
  '@type': 'Facility',
  id,
  organizationId: 'org',
  name,
  type: 'site',
  status: 'active',
  code: null,
  parentFacilityId: null,
  hasChildren: false,
  latitude,
  longitude,
  createdAt: '2026-01-01T00:00:00+00:00',
  updatedAt: '2026-01-01T00:00:00+00:00',
  ...extra,
});

async function landOnMap(page: Page, facilities: ReturnType<typeof facility>[]): Promise<void> {
  const organization = organizationOutput();
  const api = new ApiMock(page);

  await api.mockAuthenticatedSession({ organizations: [organization] });
  await api.mockOrganizationDetail(organization);
  await api.mockOrganizationAccess(organization.id);

  await page.route(`${API_BASE_URL}/api/organizations/${organization.id}/facilities**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify({ member: facilities, totalItems: facilities.length }),
    }),
  );

  await page.goto(`/organizations/${organization.id}/map`);
  await expect(page.locator('#organization-map')).toBeVisible();
}

test.describe('Facilities map', () => {
  test('renders the map when there are located facilities', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnMap(page, [
      facility('f1', 'Northgate Plant', 51.5, -0.12),
      facility('f2', 'Riverside Depot', 53.4, -2.24),
    ]);

    await expect(page.locator('app-map')).toBeVisible();
    await expect(page.locator('app-empty-state')).toHaveCount(0);
  });

  // A facility without coordinates has no address on file — not an error, so it
  // is dropped from the map rather than flagged.
  test('shows the empty state when nothing can be placed', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnMap(page, [
      facility('f1', 'Head office', null, null),
      facility('f2', 'Remote hut', 52.0, null),
    ]);

    await expect(page.locator('app-empty-state')).toBeVisible();
    await expect(page.locator('app-map')).toHaveCount(0);
  });

  test('does not push the page sideways', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await landOnMap(page, [facility('f1', 'Northgate Plant', 51.5, -0.12)]);

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );

    expect(overflows).toBe(false);
  });

  // The panel gave a name and a raw enum. A retired site kept a pin and a
  // click, with nothing saying it was retired.
  test('names the type and states the status of each site', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnMap(page, [
      facility('f1', 'Northgate Plant', 48.86, 2.35),
      facility('f2', 'Old Depot', 48.9, 2.4, { status: 'archived' }),
    ]);

    const items = page.getByTestId('map-panel-item');
    await expect(items.first()).toContainText('Site');
    await expect(items.first()).not.toContainText('site');
    await expect(items.nth(1)).toContainText('Archived');
  });

  // A pin says where a site is, never what to type into a satnav; the count is
  // what makes it worth the drive.
  test('expands the address and the equipment count for the selected site', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnMap(page, [
      facility('f1', 'Northgate Plant', 48.86, 2.35, {
        address: '12 rue de la Paix, Paris',
        equipmentCount: 41,
      }),
    ]);

    await expect(page.getByTestId('map-panel-detail')).toHaveCount(0);

    await page.getByTestId('map-panel-item').first().click();

    await expect(page.getByTestId('map-panel-address')).toContainText('12 rue de la Paix');
    await expect(page.getByTestId('map-panel-equipment')).toContainText('41');
  });

  // An older payload carries no count; printing "0" would assert an empty site.
  test('omits the counter when the payload carries none', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await landOnMap(page, [facility('f1', 'Northgate Plant', 48.86, 2.35)]);

    await page.getByTestId('map-panel-item').first().click();

    await expect(page.getByTestId('map-panel-equipment')).toHaveCount(0);
  });
});
