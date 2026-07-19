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

const facility = (id: string, name: string, latitude: number | null, longitude: number | null) => ({
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
});
