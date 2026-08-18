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
import { interventionOutput } from '../support/fixtures/intervention-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { OrganizationDashboardPage } from '../support/pages/organization-dashboard.page';

const SCREENSHOT_DIR =
  'C:/Users/valen/AppData/Local/Temp/claude/G--Projets-fireguard/16b789d4-b1a7-424b-8b78-cd4929471fe2/scratchpad/screenshots';

/** An ISO instant `daysOffset` days from now, at local noon (`e2e/README.md`'s date-fixture convention). */
function isoInstant(daysOffset: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString();
}

const overduePlanned = interventionOutput({
  id: 'e2e-intervention-overdue-1',
  '@id': '/api/interventions/e2e-intervention-overdue-1',
  number: 301,
  name: 'Inspect north riser valve',
  status: 'planned',
  dueAt: isoInstant(-3),
});
const overdueInProgress = interventionOutput({
  id: 'e2e-intervention-overdue-2',
  '@id': '/api/interventions/e2e-intervention-overdue-2',
  number: 302,
  name: 'Replace hallway smoke detector',
  status: 'in_progress',
  dueAt: isoInstant(-1),
});
const changesRequestedItem = interventionOutput({
  id: 'e2e-intervention-changes-1',
  '@id': '/api/interventions/e2e-intervention-changes-1',
  number: 303,
  name: 'Recheck sprinkler head torque',
  status: 'changes_requested',
});
const awaitingReviewItem = interventionOutput({
  id: 'e2e-intervention-review-1',
  '@id': '/api/interventions/e2e-intervention-review-1',
  number: 304,
  name: 'Submit annual alarm test',
  status: 'submitted',
});
const upcomingItem = interventionOutput({
  id: 'e2e-intervention-upcoming-1',
  '@id': '/api/interventions/e2e-intervention-upcoming-1',
  number: 305,
  name: 'Service rooftop pump',
  status: 'planned',
  dueAt: isoInstant(10),
});

/** Registers a populated work-queue mock: one row per named queue. */
async function mockPopulatedQueues(api: ApiMock): Promise<void> {
  await api.mockInterventionQueues({
    overdue: [overduePlanned, overdueInProgress],
    changesRequested: [changesRequestedItem],
    awaitingReview: [awaitingReviewItem],
    upcoming: [upcomingItem],
  });
}

/**
 * Registers the aggregate dashboard mock with every KPI, two alerts and one
 * recently-updated row, plus every trend endpoint. Every store on the page
 * loads unconditionally once it mounts (`organization-dashboard-page.component.ts`'s
 * class doc), so every test needs the trend endpoints mocked or they fall
 * through to the safety net's 404.
 */
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
 * through Chart.js — the wait after resizing lets that settle before the
 * capture, or a chart canvas screenshots mid-transition.
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

test.describe('Organization dashboard', () => {
  test('renders the header, the single KPI row, alert sentences, work queues and recently updated interventions from the mocked dashboard', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockFullDashboard(api);
    await mockPopulatedQueues(api);
    const dashboard = new OrganizationDashboardPage(page);

    await dashboard.goto(E2E_ORGANIZATION_ID);

    await expect(dashboard.root).toBeVisible();
    await expect(dashboard.pageTitle).toHaveText('Dashboard');
    await expect(dashboard.root.getByText('E2E Organization')).toBeVisible();
    await expect(dashboard.newInterventionButton).toBeVisible();

    await expect(dashboard.kpiTile('open-interventions')).toContainText('7');
    await expect(dashboard.kpiTile('open-non-conformities')).toContainText('5');
    await expect(dashboard.kpiTile('inspections-completed')).toContainText('32');
    await expect(dashboard.kpiTile('equipment-under-maintenance')).toContainText('3');
    await expect(dashboard.kpiTile('facilities')).toContainText('12');
    await expect(dashboard.kpiTile('equipment')).toContainText('48');
    await expect(dashboard.kpiTile('resolution-rate')).toContainText('83%');

    await expect(dashboard.alertRow('critical_non_conformities_open')).toContainText(
      '2 critical non-conformities still open',
    );
    await expect(dashboard.alertRow('equipment_under_maintenance')).toContainText(
      '4 equipment items under maintenance',
    );

    await expect(dashboard.queue('overdue')).toContainText('Overdue');
    await expect(dashboard.queue('overdue')).toContainText('2');
    await expect(dashboard.queue('changes-requested')).toContainText('Sent back to you');
    await expect(dashboard.queue('changes-requested')).toContainText('1');
    await expect(dashboard.queue('awaiting-review')).toContainText('Awaiting your review');
    await expect(dashboard.queue('awaiting-review')).toContainText('1');

    await expect(dashboard.recentInterventionsCard).toBeVisible();
    await expect(dashboard.recentInterventionRows).toHaveCount(1);
    await expect(dashboard.recentInterventionRows).toContainText('Replace corridor extinguisher');
    await expect(dashboard.recentInterventionRows.locator('app-intervention-tag')).toBeVisible();
    await expect(dashboard.recentInterventionRows).toContainText('JR');

    await expect(dashboard.chartCanvas(dashboard.inspectionsChartCard)).toBeVisible();
    await expect(dashboard.chartCanvas(dashboard.nonConformitiesChartCard)).toBeVisible();
    await expect(dashboard.chartCanvas(dashboard.equipmentChartCard)).toBeVisible();
    await expect(dashboard.chartCanvas(dashboard.facilitiesChartCard)).toBeVisible();
  });

  test('hides the KPI row, the alert strip and the severity card on a dashboard 403, leaving the work queues and the trend charts usable', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationDashboardError(E2E_ORGANIZATION_ID);
    await mockPopulatedQueues(api);
    await mockFullTrends(api);
    const dashboard = new OrganizationDashboardPage(page);

    await dashboard.goto(E2E_ORGANIZATION_ID);

    await expect(dashboard.queue('overdue')).toContainText('Overdue');
    await expect(dashboard.queue('overdue')).toContainText('2');
    await expect(dashboard.kpiSection).toHaveCount(0);
    await expect(dashboard.alertsSection).toHaveCount(0);
    await expect(dashboard.recentInterventionsCard).toHaveCount(0);
    await expect(dashboard.severityRows).toHaveCount(0);
    await expect(dashboard.chartCanvas(dashboard.inspectionsChartCard)).toBeVisible();

    await dashboard.openQueueRow('overdue');

    await expect(page).toHaveURL(
      new RegExp(`/organizations/${E2E_ORGANIZATION_ID}/interventions\\?due=overdue$`),
    );
  });

  test('deep-links each queue row to the interventions list with the matching query params', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockFullDashboard(api);
    await mockPopulatedQueues(api);
    const dashboard = new OrganizationDashboardPage(page);

    await dashboard.goto(E2E_ORGANIZATION_ID);
    await dashboard.openQueueRow('overdue');
    await expect(page).toHaveURL(
      new RegExp(`/organizations/${E2E_ORGANIZATION_ID}/interventions\\?due=overdue$`),
    );

    await dashboard.goto(E2E_ORGANIZATION_ID);
    await dashboard.openQueueRow('changes-requested');
    await expect(page).toHaveURL(
      new RegExp(`/organizations/${E2E_ORGANIZATION_ID}/interventions\\?status=changes_requested$`),
    );

    await dashboard.goto(E2E_ORGANIZATION_ID);
    await dashboard.openQueueRow('awaiting-review');
    await expect(page).toHaveURL(
      new RegExp(`/organizations/${E2E_ORGANIZATION_ID}/interventions\\?status=submitted$`),
    );
  });

  test('renders the all-clear state when every queue is empty, keeping the KPI row visible on a successful dashboard fetch', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockFullDashboard(api);
    await api.mockInterventionQueues({ upcoming: [upcomingItem] });
    const dashboard = new OrganizationDashboardPage(page);

    await dashboard.goto(E2E_ORGANIZATION_ID);

    await expect(dashboard.allClearState).toBeVisible();
    await expect(dashboard.kpiSection).toBeVisible();
    await expect(dashboard.kpiTile('open-interventions')).toContainText('7');
    await expect(page.getByText('FG-305')).toBeVisible();
    await expect(page.getByText('Service rooftop pump')).toBeVisible();
  });

  test('links a recently updated intervention row to its detail route', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockFullDashboard(api);
    await mockPopulatedQueues(api);
    const dashboard = new OrganizationDashboardPage(page);

    await dashboard.goto(E2E_ORGANIZATION_ID);

    await dashboard.openRecentIntervention('Replace corridor extinguisher');

    await expect(page).toHaveURL(
      `/organizations/${E2E_ORGANIZATION_ID}/interventions/e2e-intervention-recent-1`,
    );
  });

  test('shows the shell header sync indicator in its quiet up-to-date state, outside the page content, with the shell header free of the trends period controls', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockFullDashboard(api);
    await mockPopulatedQueues(api);
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
    await mockPopulatedQueues(api);

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
    await mockPopulatedQueues(api);
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
    await expect(dashboard.kpiTile('facilities')).toContainText('12');
  });

  test('refetches the trend charts with compare disabled when the compare switch is turned off, leaving the KPI row untouched', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockFullDashboard(api);
    await mockPopulatedQueues(api);
    const dashboard = new OrganizationDashboardPage(page);

    await dashboard.goto(E2E_ORGANIZATION_ID);

    await expect(dashboard.inspectionsChartCard.getByText('vs previous period')).toBeVisible();
    await expect(dashboard.compareSwitch).toHaveAttribute('aria-checked', 'true');
    await expect(dashboard.kpiTile('facilities')).toContainText('12');

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
    await expect(dashboard.kpiTile('facilities')).toContainText('12');
  });

  test('renders the non-conformity severity breakdown with an icon and a label per row', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockFullDashboard(api);
    await mockPopulatedQueues(api);
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
    await mockPopulatedQueues(api);
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

    await expect(dashboard.kpiTile('facilities')).toContainText('12');
    await expect(dashboard.severityRows).toHaveCount(4);
    await expect(dashboard.chartCanvas(dashboard.equipmentChartCard)).toBeVisible();
    await expect(dashboard.chartCanvas(dashboard.facilitiesChartCard)).toBeVisible();
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
    await mockPopulatedQueues(api);
    const dashboard = new OrganizationDashboardPage(page);

    await dashboard.goto(E2E_ORGANIZATION_ID);

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(dashboard.root).toBeVisible();
    await expect(dashboard.kpiSection).toBeVisible();
    await expect(dashboard.alertsSection).toBeVisible();
    await expect(dashboard.chartCanvas(dashboard.inspectionsChartCard)).toBeVisible();
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
    await mockPopulatedQueues(api);
    const dashboard = new OrganizationDashboardPage(page);

    await dashboard.goto(E2E_ORGANIZATION_ID);

    await expect(dashboard.root).toBeVisible();
    await expect(dashboard.kpiSection).toBeVisible();
    await expect(dashboard.chartCanvas(dashboard.inspectionsChartCard)).toBeVisible();
    await screenshotFullContent(
      page,
      dashboard.root,
      `${SCREENSHOT_DIR}/dashboard-light-desktop.png`,
    );
  });
});
