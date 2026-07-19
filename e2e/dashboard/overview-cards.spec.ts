import { expect, test, type Page } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * The two composition cards on Overview — "By severity" and "Fleet status".
 *
 * Their unit specs cover the arithmetic (bar scaling, totals, empty fleets) but
 * cannot see the things that only exist once the real shell lays out around
 * them: whether the 6+6 grid holds at desktop width, whether a canvas inside a
 * flex column pushes the document sideways, and whether both cards survive the
 * dark scheme. That is what this suite is for.
 *
 * The payload mirrors the real `/dashboard` response, including the flat
 * `{ key, value }` summary lists where the severity and status counts sit next
 * to the totals — the exact shape the two adapters have to pick apart.
 */
const API_BASE_URL = process.env['E2E_API_BASE_URL'] ?? 'http://localhost:8000';

const day = (n: number): string => `2026-07-${String(n).padStart(2, '0')}`;

const series = (values: readonly number[]) =>
  values.map((value, index) => ({ bucket: day(index + 1), value }));

function dashboardPayload() {
  return {
    overview: {
      facilities: { summary: [{ key: 'total', value: 12 }], primary: { key: 'total', value: 12 } },
      members: { summary: [{ key: 'total', value: 34 }], primary: { key: 'total', value: 34 } },
      inspections: {
        summary: [{ key: 'closed', value: 87 }],
        primary: { key: 'closed', value: 87 },
      },
      equipment: {
        summary: [
          { key: 'total', value: 40 },
          { key: 'in_stock', value: 5 },
          { key: 'operational', value: 28 },
          { key: 'under_maintenance', value: 4 },
          { key: 'decommissioned', value: 3 },
        ],
        primary: { key: 'operational', value: 28 },
      },
      nonConformities: {
        summary: [
          { key: 'open', value: 12 },
          { key: 'severityCritical', value: 3 },
          { key: 'severityHigh', value: 2 },
          { key: 'severityMedium', value: 5 },
          { key: 'severityLow', value: 2 },
        ],
        primary: { key: 'open', value: 12 },
      },
    },
    trends: {
      facilities: series([1, 2, 3, 5, 8, 10, 12]),
      members: series([4, 9, 14, 20, 26, 30, 34]),
      equipment: series([6, 12, 18, 24, 31, 36, 40]),
      inspections: series([10, 22, 35, 48, 62, 75, 87]),
    },
    comparison: { metrics: [] },
    recentInterventions: [],
  };
}

async function landOnOverview(page: Page): Promise<void> {
  const organization = organizationOutput();
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [organization] });
  await api.mockOrganizationDetail(organization);
  await api.mockOrganizationAccess(organization.id);

  await page.route(`${API_BASE_URL}/api/organizations/${organization.id}/dashboard**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify(dashboardPayload()),
    }),
  );

  await page.goto(`/organizations/${organization.id}`);
  await expect(page.locator('#dashboard-layout')).toBeVisible();
}

test.describe('Overview composition cards', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`renders both cards without pushing the page sideways — ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1200 });
      await landOnOverview(page);

      if (theme === 'dark') {
        await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      }

      const severity = page.locator('app-non-conformities-by-severity');
      const fleet = page.locator('app-equipment-status-breakdown');

      await expect(severity).toBeVisible();
      await expect(fleet).toBeVisible();

      // Four severities, four fleet statuses — a dropped bucket would show here.
      await expect(severity.locator('[role="meter"]')).toHaveCount(4);
      await expect(fleet.locator('li')).toHaveCount(4);

      // The canvas is aria-hidden, so the legend is the accessible carrier.
      await expect(fleet).toContainText('Operational');
      await expect(fleet).toContainText('40');
      await expect(severity).toContainText('Critical');
      await expect(severity).toContainText('12');

      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflows).toBe(false);
    });
  }

  // The 6+6 pairing is what keeps the row from ending half-empty.
  test('pairs the two cards side by side on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    await landOnOverview(page);

    const severityBox = await page.locator('app-non-conformities-by-severity').boundingBox();
    const fleetBox = await page.locator('app-equipment-status-breakdown').boundingBox();

    if (severityBox === null || fleetBox === null) {
      throw new Error('Both composition cards must be laid out to compare their positions.');
    }

    expect(fleetBox.x).toBeGreaterThan(severityBox.x);
    expect(Math.abs(fleetBox.y - severityBox.y)).toBeLessThan(4);
  });
});
