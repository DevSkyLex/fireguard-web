import { expect, test } from '@playwright/test';
import {
  ALL_ORGANIZATION_PERMISSIONS,
  E2E_ORGANIZATION_ID,
} from '../support/fixtures/api-fixtures';
import { expectNoHorizontalOverflow } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';

for (const viewport of [
  { width: 1562, columns: true },
  { width: 375, columns: false },
]) {
  test(`lays out the seven calendar days at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: 938 });
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
      permissions: [...ALL_ORGANIZATION_PERMISSIONS, 'organization.events.read'],
    });
    await api.mockCalendarFeed(E2E_ORGANIZATION_ID);
    await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
    await page.route(/\/calendar\/feed-token$/, (route) =>
      route.fulfill({ status: 404, contentType: 'application/ld+json', body: '{}' }),
    );

    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/calendar`);
    await page.getByTestId('calendar-granularity-week').click();

    const grid = page.getByTestId('calendar-week-grid');
    const days = grid.getByTestId('calendar-week-day');
    await expect(grid).toBeVisible();
    await expect(days).toHaveCount(7);

    const first = await days.nth(0).boundingBox();
    const second = await days.nth(1).boundingBox();
    const last = await days.nth(6).boundingBox();
    if (!first || !second || !last) throw new Error('Every calendar day needs visible bounds.');

    if (viewport.columns) {
      expect(Math.abs(first.y - last.y)).toBeLessThanOrEqual(1);
      expect(second.x).toBeGreaterThan(first.x);
    } else {
      expect(Math.abs(first.x - second.x)).toBeLessThanOrEqual(1);
      expect(second.y).toBeGreaterThan(first.y);
    }

    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: `tests/e2e/artifacts/calendar-week-layout-${viewport.width}.png`,
      animations: 'disabled',
    });
  });
}
