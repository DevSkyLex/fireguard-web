import { expect, test, type Page } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * The three composition cards on Overview — "By severity", "Inspection
 * results" and "Fleet status".
 *
 * Their unit specs cover the arithmetic (bar scaling, totals, empty
 * populations) but cannot see the things that only exist once the real shell
 * lays out around them: whether the 4+4+4 row holds at desktop width, whether a
 * canvas inside a flex column pushes the document sideways, and whether the
 * cards survive the dark scheme. That is what this suite is for.
 *
 * The payload mirrors the real `/dashboard` response, including the flat
 * `{ key, value }` summary lists where the severity, outcome and status counts
 * sit next to the totals — the exact shape the three adapters have to pick
 * apart.
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
        summary: [
          { key: 'total', value: 100 },
          { key: 'draft', value: 10 },
          { key: 'submitted', value: 3 },
          { key: 'closed', value: 87 },
          { key: 'pass', value: 60 },
          { key: 'fail', value: 9 },
          { key: 'partial', value: 12 },
        ],
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
      interventions: {
        summary: [
          { key: 'total', value: 31 },
          { key: 'open', value: 12 },
          { key: 'overdue', value: 4 },
        ],
        primary: { key: 'open', value: 12 },
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
    test(`renders every card without pushing the page sideways — ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1200 });
      await landOnOverview(page);

      if (theme === 'dark') {
        await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
      }

      const severity = page.locator('app-non-conformities-by-severity');
      const results = page.locator('app-inspection-result-breakdown');
      const fleet = page.locator('app-equipment-status-breakdown');

      await expect(severity).toBeVisible();
      await expect(results).toBeVisible();
      await expect(fleet).toBeVisible();

      // Four severities, three outcomes, four fleet statuses — a dropped bucket
      // would show here.
      await expect(severity.locator('[role="meter"]')).toHaveCount(4);
      await expect(results.locator('li')).toHaveCount(3);
      await expect(fleet.locator('li')).toHaveCount(4);

      // The canvas is aria-hidden, so the legend is the accessible carrier.
      await expect(fleet).toContainText('Operational');
      await expect(fleet).toContainText('40');
      await expect(severity).toContainText('Critical');
      await expect(severity).toContainText('12');
      await expect(results).toContainText('Pass');
      // The centre counts graded inspections (60 + 12 + 9), not the 100 total:
      // a draft has no outcome and would leave the ring short of its own centre.
      await expect(results).toContainText('81');
      await expect(results).not.toContainText('100');

      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflows).toBe(false);
    });
  }

  // The 4+4+4 triple is what keeps the row from ending part-empty.
  test('lines the three cards up on one desktop row', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    await landOnOverview(page);

    const boxes = await Promise.all(
      [
        'app-non-conformities-by-severity',
        'app-inspection-result-breakdown',
        'app-equipment-status-breakdown',
      ].map((selector: string) => page.locator(selector).boundingBox()),
    );

    if (boxes.some((box) => box === null)) {
      throw new Error('Every composition card must be laid out to compare their positions.');
    }

    const [severity, results, fleet] = boxes as { x: number; y: number }[];
    expect(results.x).toBeGreaterThan(severity.x);
    expect(fleet.x).toBeGreaterThan(results.x);
    expect(Math.abs(results.y - severity.y)).toBeLessThan(4);
    expect(Math.abs(fleet.y - severity.y)).toBeLessThan(4);
  });

  // The dashboard overview had no interventions section at all: the strip
  // counted places and things, never the work in flight.
  test('shows the open interventions with how many are late', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    await landOnOverview(page);

    const strip = page.locator('app-dashboard-metric-strip');
    await expect(strip).toContainText('Open interventions');
    await expect(strip).toContainText('12');
    // Lateness is a second fact about the same population, not a trend.
    await expect(page.getByTestId('metric-cell-note')).toContainText('4');
  });
});
