import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  equipmentCreatedTrendOutput,
  facilitiesCreatedTrendOutput,
  inspectionsTrendOutput,
  nonConformitiesOpenedTrendOutput,
  nonConformitiesResolvedTrendOutput,
  organizationDashboardAlertOutput,
  organizationDashboardOutput,
  organizationDashboardRecentInterventionOutput,
} from '../support/fixtures/dashboard-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { OrganizationDashboardPage } from '../support/pages/organization-dashboard.page';

const SCREENSHOT_DIR = 'e2e/artifacts/dashboard';
/** Registers aggregate data and the optional Analysis trend endpoints. */
async function mockFullDashboard(api: ApiMock): Promise<void> {
  await api.mockOrganizationDashboard(
    E2E_ORGANIZATION_ID,
    organizationDashboardOutput({
      alerts: [
        organizationDashboardAlertOutput({
          code: 'critical_non_conformities_open',
          severity: 'danger',
          count: 2,
        }),
        organizationDashboardAlertOutput({
          code: 'equipment_under_maintenance',
          severity: 'warning',
          count: 4,
        }),
      ],
      recentInterventions: [
        organizationDashboardRecentInterventionOutput({
          id: 'e2e-intervention-recent-1',
          number: 205,
          name: 'Replace corridor extinguisher',
          responsibleName: 'Jamie Rivera',
        }),
      ],
    }),
  );
  await mockFullTrends(api);
}

/** Registers every trend mock the Trends section needs for a full, permitted render. */
async function mockFullTrends(api: ApiMock): Promise<void> {
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
 * through the native SVG renderer — the wait after resizing lets that settle before the
 * capture, so the SVG layout is settled.
 */
async function screenshotFullContent(page: Page, root: Locator, path: string): Promise<void> {
  const viewport = page.viewportSize();
  const width = viewport?.width ?? 1280;

  await page.setViewportSize({
    width,
    height: (await root.evaluate((el) => el.scrollHeight)) + 32,
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await root.screenshot({ path });
}

test.describe('Organization dashboard', () => {
  test('opens directly on four operational metrics and native charts', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockFullDashboard(api);
    const dashboard = new OrganizationDashboardPage(page);
    await dashboard.goto(E2E_ORGANIZATION_ID);
    await expect(dashboard.kpiSection.locator('app-stat-tile')).toHaveCount(4);
    await expect(dashboard.kpiTile('open-interventions')).toContainText('7');
    await expect(dashboard.kpiTile('open-non-conformities')).toContainText('5');
    await expect(dashboard.kpiTile('inspections-completed')).toContainText('32');
    await expect(dashboard.kpiTile('equipment-under-maintenance')).toContainText('3');
    await expect(dashboard.root.getByRole('tablist')).toHaveCount(0);
    await expect(page.getByTestId('org-dashboard-identity')).toHaveCount(0);
    await expect(page.getByTestId('org-today-queues-card')).toHaveCount(0);
    await expect(dashboard.root.locator('tanstack-chart[hlmChart]')).toHaveCount(4);
    await expect(dashboard.newInterventionButton).toBeVisible();
  });
  test('keeps permitted trends available when the aggregate dashboard is forbidden', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationDashboardError(E2E_ORGANIZATION_ID);
    await mockFullTrends(api);
    const dashboard = new OrganizationDashboardPage(page);
    await dashboard.goto(E2E_ORGANIZATION_ID);
    await expect(dashboard.kpiSection).toHaveCount(0);
    await expect(dashboard.severityRows).toHaveCount(0);
    await expect(dashboard.chartSvg(dashboard.inspectionsChartCard)).toBeVisible();
  });

  test('shows the shell header sync indicator in its quiet up-to-date state, outside the page content, with the shell header free of the trends period controls', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockFullDashboard(api);

    const dashboard = new OrganizationDashboardPage(page);

    await dashboard.goto(E2E_ORGANIZATION_ID);

    await expect(dashboard.syncIndicatorTrigger).toBeVisible();
    await expect(dashboard.root.getByTestId('intervention-sync-status')).toHaveCount(0);
    await expect(dashboard.syncIndicatorTrigger).toHaveAttribute('aria-label', 'Up to date');
    await expect(
      dashboard.syncIndicatorTrigger.getByTestId('intervention-sync-blocked-count'),
    ).toHaveCount(0);
    await expect(
      dashboard.syncIndicatorTrigger.getByTestId('intervention-sync-pending-count'),
    ).toHaveCount(0);
    await expect(
      page.locator('#dashboard-page-header').getByTestId('org-statistics-period-toggle'),
    ).toHaveCount(0);

    await dashboard.openSyncIndicator();

    await expect(dashboard.syncIndicatorLastSynced).toBeVisible();
    await expect(dashboard.syncIndicatorLastSynced).toContainText('Last synced');
  });

  test('redirects the retired /statistics route to the dashboard landing route', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockFullDashboard(api);

    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/statistics`);

    await expect(page).toHaveURL(`/organizations/${E2E_ORGANIZATION_ID}`);
    await expect(page.locator('#organization-dashboard')).toBeVisible();
  });

  test('refetches the trend charts with the new granularity when the period preset changes, and applies it only below the trends header', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockFullDashboard(api);

    const dashboard = new OrganizationDashboardPage(page);

    await dashboard.goto(E2E_ORGANIZATION_ID);

    await expect(dashboard.inspectionsChartCard).toBeVisible();

    const [inspectionsRequest] = await Promise.all([
      page.waitForRequest(
        (request) =>
          request.url().includes('/dashboard/trends/inspections') &&
          request.url().includes('granularity=week'),
      ),
      dashboard.selectPeriod('90D'),
    ]);

    expect(inspectionsRequest.url()).toContain('granularity=week');
    await expect(dashboard.kpiTile('open-interventions')).toContainText('7');
  });

  test('refetches the trend charts with compare disabled when the compare switch is turned off, leaving the KPI row untouched', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockFullDashboard(api);

    const dashboard = new OrganizationDashboardPage(page);

    await dashboard.goto(E2E_ORGANIZATION_ID);

    await expect(dashboard.inspectionsChartCard.getByText('vs previous period')).toBeVisible();
    await expect(dashboard.compareSwitch).toHaveAttribute('aria-checked', 'true');
    await expect(dashboard.kpiTile('open-interventions')).toContainText('7');

    const [inspectionsRequest] = await Promise.all([
      page.waitForRequest(
        (request) =>
          request.url().includes('/dashboard/trends/inspections') &&
          !request.url().includes('compare=true'),
      ),
      dashboard.toggleCompare(),
    ]);

    expect(inspectionsRequest.url()).not.toContain('compare=true');
    await expect(dashboard.compareSwitch).toHaveAttribute('aria-checked', 'false');
    await expect(dashboard.kpiTile('open-interventions')).toContainText('7');
  });

  test('renders the non-conformity severity breakdown with an icon and a label per row', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockFullDashboard(api);

    const dashboard = new OrganizationDashboardPage(page);

    await dashboard.goto(E2E_ORGANIZATION_ID);

    await expect(dashboard.severityRows).toHaveCount(4);

    const critical = dashboard.severityRow('critical');
    await expect(critical).toBeVisible();
    await expect(critical.locator('ng-icon')).toBeVisible();
    await expect(critical).toContainText('Critical');
    await expect(critical).toContainText('1');

    const high = dashboard.severityRow('high');
    await expect(high).toBeVisible();
    await expect(high.locator('ng-icon')).toBeVisible();
    await expect(high).toContainText('High');
    await expect(high).toContainText('1');

    const medium = dashboard.severityRow('medium');
    await expect(medium).toBeVisible();
    await expect(medium.locator('ng-icon')).toBeVisible();
    await expect(medium).toContainText('Medium');
    await expect(medium).toContainText('2');

    const low = dashboard.severityRow('low');
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
    await mockFullDashboard(api);

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
    const dashboard = new OrganizationDashboardPage(page);

    await dashboard.goto(E2E_ORGANIZATION_ID);

    await expect(
      dashboard.inspectionsChartCard.getByText('Not available with your permissions.'),
    ).toBeVisible();
    await expect(
      dashboard.nonConformitiesChartCard.getByText('Not available with your permissions.'),
    ).toBeVisible();

    await expect(dashboard.kpiTile('open-interventions')).toContainText('7');
    await expect(dashboard.severityRows).toHaveCount(4);
    await expect(dashboard.chartSvg(dashboard.equipmentChartCard)).toBeVisible();
    await expect(dashboard.chartSvg(dashboard.facilitiesChartCard)).toBeVisible();
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

    const dashboard = new OrganizationDashboardPage(page);

    await dashboard.goto(E2E_ORGANIZATION_ID);

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(dashboard.root).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/dashboard-overview-mobile-dark.png` });

    await expect(dashboard.kpiSection).toBeVisible();

    await expect(dashboard.chartSvg(dashboard.inspectionsChartCard)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await screenshotFullContent(
      page,
      dashboard.root,
      `${SCREENSHOT_DIR}/dashboard-dark-mobile.png`,
    );
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });

  test('renders on desktop in light mode', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockFullDashboard(api);

    const dashboard = new OrganizationDashboardPage(page);

    await dashboard.goto(E2E_ORGANIZATION_ID);

    await expect(dashboard.root).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/dashboard-overview-desktop-light.png` });

    await expect(dashboard.kpiSection).toBeVisible();

    await expect(dashboard.chartSvg(dashboard.inspectionsChartCard)).toBeVisible();
    await screenshotFullContent(
      page,
      dashboard.root,
      `${SCREENSHOT_DIR}/dashboard-light-desktop.png`,
    );
  });
});
