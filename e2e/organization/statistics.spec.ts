import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  equipmentCreatedTrendOutput,
  facilitiesCreatedTrendOutput,
  inspectionsTrendOutput,
  nonConformitiesOpenedTrendOutput,
  nonConformitiesResolvedTrendOutput,
  organizationDashboardOutput,
} from '../support/fixtures/dashboard-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { OrganizationStatisticsPage } from '../support/pages/organization-statistics.page';

const SCREENSHOT_DIR =
  'C:/Users/valen/AppData/Local/Temp/claude/G--Projets-fireguard/8ab87c77-49b6-4d36-a37e-080efde2fd91/scratchpad/screenshots';

/** Registers every dashboard + trend mock the statistics page needs for a full, permitted render. */
async function mockFullDashboard(api: ApiMock): Promise<void> {
  await api.mockOrganizationDashboard(E2E_ORGANIZATION_ID, organizationDashboardOutput());
  await api.mockDashboardInspectionsTrend(E2E_ORGANIZATION_ID, inspectionsTrendOutput());
  await api.mockDashboardNonConformitiesOpenedTrend(
    E2E_ORGANIZATION_ID,
    nonConformitiesOpenedTrendOutput(),
  );
  await api.mockDashboardNonConformitiesResolvedTrend(
    E2E_ORGANIZATION_ID,
    nonConformitiesResolvedTrendOutput(),
  );
  await api.mockDashboardEquipmentCreatedTrend(E2E_ORGANIZATION_ID, equipmentCreatedTrendOutput());
  await api.mockDashboardFacilitiesCreatedTrend(
    E2E_ORGANIZATION_ID,
    facilitiesCreatedTrendOutput(),
  );
}

/**
 * Grows the viewport to the page root's full scroll height before
 * screenshotting it, so the capture shows the whole page — the shell's main
 * content pane scrolls internally rather than the document, which leaves a
 * viewport-sized `page.screenshot({ fullPage: true })` cropped to the fold.
 * The resize reflows every `app-line-chart`'s `ResizeObserver`, which redraws
 * each series through ngx-charts' own 750ms D3 transition (unaffected by
 * Angular's `provideNoopAnimations`, which only no-ops `@Component`
 * animation triggers) — the wait after resizing lets that settle before the
 * capture, or the series paths screenshot mid-transition.
 */
async function screenshotFullContent(page: Page, root: Locator, path: string): Promise<void> {
  const viewport = page.viewportSize();
  const width = viewport?.width ?? 1280;

  await page.setViewportSize({
    width,
    height: (await root.evaluate((el) => el.scrollHeight)) + 32,
  });
  await page.waitForTimeout(1000);
  await root.screenshot({ path });
}

/**
 * Asserts a chart card rendered at least one real ngx-charts series path —
 * the proof `LineChart`'s scale fix works for string-labelled buckets — by
 * checking every matched path carries a non-empty `d` attribute rather than
 * an empty or default one.
 */
async function assertChartRendersSeries(seriesPaths: Locator): Promise<void> {
  await expect(seriesPaths.first()).toBeVisible();

  const pathData = await seriesPaths.evaluateAll((paths) =>
    paths.map((path) => path.getAttribute('d')),
  );

  expect(pathData.length).toBeGreaterThan(0);
  expect(
    pathData.every((d) => Boolean(d)),
    'every rendered series path has a "d" attribute',
  ).toBe(true);
}

test.describe('Organization statistics', () => {
  test('renders KPI values and every trend chart as actual rendered ngx-charts SVG series', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockFullDashboard(api);
    const statistics = new OrganizationStatisticsPage(page);

    await statistics.goto(E2E_ORGANIZATION_ID);

    await expect(statistics.root).toBeVisible();
    await expect(statistics.kpiTile('facilities')).toContainText('12');
    await expect(statistics.kpiTile('equipment')).toContainText('48');
    await expect(statistics.kpiTile('inspections-completed')).toContainText('32');
    await expect(statistics.kpiTile('open-non-conformities')).toContainText('5');
    await expect(statistics.kpiTile('resolution-rate')).toContainText('83%');

    await assertChartRendersSeries(statistics.chartSeriesPaths(statistics.inspectionsChartCard));
    await assertChartRendersSeries(
      statistics.chartSeriesPaths(statistics.nonConformitiesChartCard),
    );
    await assertChartRendersSeries(statistics.chartSeriesPaths(statistics.equipmentChartCard));
    await assertChartRendersSeries(statistics.chartSeriesPaths(statistics.facilitiesChartCard));
  });

  test('refetches the trend charts with the new granularity when the period preset changes', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockFullDashboard(api);
    const statistics = new OrganizationStatisticsPage(page);

    await statistics.goto(E2E_ORGANIZATION_ID);
    await expect(statistics.inspectionsChartCard).toBeVisible();

    const [inspectionsRequest] = await Promise.all([
      page.waitForRequest(
        (request) =>
          request.url().includes('/dashboard/trends/inspections') &&
          request.url().includes('granularity=week'),
      ),
      statistics.selectPeriod('90D'),
    ]);

    expect(inspectionsRequest.url()).toContain('granularity=week');
  });

  test('hides KPI deltas when the compare toggle is turned off', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockFullDashboard(api);
    const statistics = new OrganizationStatisticsPage(page);

    await statistics.goto(E2E_ORGANIZATION_ID);

    await expect(statistics.kpiTile('facilities').getByText('+3')).toBeVisible();
    await expect(statistics.compareSwitch).toHaveAttribute('aria-checked', 'true');

    await statistics.toggleCompare();

    await expect(statistics.compareSwitch).toHaveAttribute('aria-checked', 'false');
    await expect(statistics.kpiTile('facilities').getByText('+3')).toHaveCount(0);
  });

  test('renders the non-conformity severity breakdown with an icon and a label per row', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockFullDashboard(api);
    const statistics = new OrganizationStatisticsPage(page);

    await statistics.goto(E2E_ORGANIZATION_ID);

    await expect(statistics.severityRows).toHaveCount(4);

    const critical = statistics.severityRow('critical');
    await expect(critical).toBeVisible();
    await expect(critical.locator('ng-icon')).toBeVisible();
    await expect(critical).toContainText('Critical');
    await expect(critical).toContainText('1');

    const high = statistics.severityRow('high');
    await expect(high).toBeVisible();
    await expect(high.locator('ng-icon')).toBeVisible();
    await expect(high).toContainText('High');
    await expect(high).toContainText('1');

    const medium = statistics.severityRow('medium');
    await expect(medium).toBeVisible();
    await expect(medium.locator('ng-icon')).toBeVisible();
    await expect(medium).toContainText('Medium');
    await expect(medium).toContainText('2');

    const low = statistics.severityRow('low');
    await expect(low).toBeVisible();
    await expect(low.locator('ng-icon')).toBeVisible();
    await expect(low).toContainText('Low');
    await expect(low).toContainText('1');
  });

  test('shows a permission-degraded card when a trend endpoint returns 403, leaving the rest of the page intact', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationDashboard(E2E_ORGANIZATION_ID, organizationDashboardOutput());
    await api.mockDashboardInspectionsTrendError(E2E_ORGANIZATION_ID);
    await api.mockDashboardNonConformitiesOpenedTrend(
      E2E_ORGANIZATION_ID,
      nonConformitiesOpenedTrendOutput(),
    );
    await api.mockDashboardNonConformitiesResolvedTrend(
      E2E_ORGANIZATION_ID,
      nonConformitiesResolvedTrendOutput(),
    );
    await api.mockDashboardEquipmentCreatedTrend(
      E2E_ORGANIZATION_ID,
      equipmentCreatedTrendOutput(),
    );
    await api.mockDashboardFacilitiesCreatedTrend(
      E2E_ORGANIZATION_ID,
      facilitiesCreatedTrendOutput(),
    );
    const statistics = new OrganizationStatisticsPage(page);

    await statistics.goto(E2E_ORGANIZATION_ID);

    await expect(
      statistics.inspectionsChartCard.getByText('Not available with your permissions.'),
    ).toBeVisible();
    await expect(
      statistics.nonConformitiesChartCard.getByText('Not available with your permissions.'),
    ).toBeVisible();

    await expect(statistics.kpiTile('facilities')).toContainText('12');
    await expect(statistics.severityRows).toHaveCount(4);
    await expect(statistics.chartSeriesPaths(statistics.equipmentChartCard).first()).toBeVisible();
    await expect(statistics.chartSeriesPaths(statistics.facilitiesChartCard).first()).toBeVisible();
  });

  test('renders at 375px in dark mode with no console errors and no horizontal overflow', async ({
    page,
    context,
    baseURL,
  }) => {
    const consoleErrors = collectConsoleErrors(page);
    await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await page.setViewportSize({ width: 375, height: 800 });

    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockFullDashboard(api);
    const statistics = new OrganizationStatisticsPage(page);

    await statistics.goto(E2E_ORGANIZATION_ID);

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(statistics.root).toBeVisible();
    await expect(
      statistics.chartSeriesPaths(statistics.inspectionsChartCard).first(),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await screenshotFullContent(
      page,
      statistics.root,
      `${SCREENSHOT_DIR}/statistics-dark-mobile.png`,
    );
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });

  test('renders on desktop in light mode', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockFullDashboard(api);
    const statistics = new OrganizationStatisticsPage(page);

    await statistics.goto(E2E_ORGANIZATION_ID);

    await expect(statistics.root).toBeVisible();
    await expect(
      statistics.chartSeriesPaths(statistics.inspectionsChartCard).first(),
    ).toBeVisible();
    await screenshotFullContent(
      page,
      statistics.root,
      `${SCREENSHOT_DIR}/statistics-light-desktop.png`,
    );
  });
});
