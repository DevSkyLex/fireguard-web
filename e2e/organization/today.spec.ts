import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
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
import { OrganizationTodayPage } from '../support/pages/organization-today.page';

const SCREENSHOT_DIR =
  'C:/Users/valen/AppData/Local/Temp/claude/G--Projets-fireguard/8ab87c77-49b6-4d36-a37e-080efde2fd91/scratchpad/screenshots';

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

/** Registers the aggregate dashboard mock with every KPI, two alerts and one recently-updated row. */
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
}

/**
 * Grows the viewport to the page root's full scroll height before
 * screenshotting it, so the capture shows the whole page — the shell's main
 * content pane scrolls internally rather than the document, which leaves a
 * viewport-sized `page.screenshot({ fullPage: true })` cropped to the fold.
 */
async function screenshotFullContent(page: Page, root: Locator, path: string): Promise<void> {
  const viewport = page.viewportSize();
  const width = viewport?.width ?? 1280;

  await page.setViewportSize({
    width,
    height: (await root.evaluate((el) => el.scrollHeight)) + 32,
  });
  await page.waitForTimeout(300);
  await root.screenshot({ path });
}

test.describe('Organization Today page', () => {
  test('renders the header, KPI row, alert sentences, work queues and recently updated interventions from the mocked dashboard', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockFullDashboard(api);
    await mockPopulatedQueues(api);
    const today = new OrganizationTodayPage(page);

    await today.goto(E2E_ORGANIZATION_ID);

    await expect(today.root).toBeVisible();
    await expect(today.root.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
    await expect(today.root.getByText('E2E Organization')).toBeVisible();
    await expect(today.newInterventionButton).toBeVisible();

    await expect(today.kpiTile('open-interventions')).toContainText('7');
    await expect(today.kpiTile('open-non-conformities')).toContainText('5');
    await expect(today.kpiTile('inspections-completed')).toContainText('32');
    await expect(today.kpiTile('equipment-under-maintenance')).toContainText('3');

    await expect(today.alertRow('critical_non_conformities_open')).toContainText(
      '2 critical non-conformities still open',
    );
    await expect(today.alertRow('equipment_under_maintenance')).toContainText(
      '4 equipment items under maintenance',
    );

    await expect(today.queueRow('overdue', 'Inspect north riser valve')).toBeVisible();
    await expect(today.queueRow('overdue', 'Replace hallway smoke detector')).toBeVisible();
    await expect(
      today.queueRow('changes-requested', 'Recheck sprinkler head torque'),
    ).toBeVisible();
    await expect(today.queueRow('awaiting-review', 'Submit annual alarm test')).toBeVisible();

    await expect(today.recentInterventionsCard).toBeVisible();
    await expect(today.recentInterventionRows).toHaveCount(1);
    await expect(today.recentInterventionRows).toContainText('Replace corridor extinguisher');
    await expect(today.recentInterventionRows.locator('app-intervention-tag')).toBeVisible();
    await expect(today.recentInterventionRows).toContainText('JR');
  });

  test('hides the KPI row and the alert strip on a dashboard 403, leaving the work queues usable', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationDashboardError(E2E_ORGANIZATION_ID);
    await mockPopulatedQueues(api);
    const today = new OrganizationTodayPage(page);

    await today.goto(E2E_ORGANIZATION_ID);

    await expect(today.queueRow('overdue', 'Inspect north riser valve')).toBeVisible();
    await expect(today.kpiSection).toHaveCount(0);
    await expect(today.alertsSection).toHaveCount(0);
    await expect(today.recentInterventionsCard).toHaveCount(0);

    await today.queueSeeAllButton('overdue').click();

    await expect(page).toHaveURL(
      new RegExp(`/organizations/${E2E_ORGANIZATION_ID}/interventions\\?due=overdue$`),
    );
  });

  test('deep-links each queue\'s "See all" button to the interventions list with the matching query params', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockFullDashboard(api);
    await mockPopulatedQueues(api);
    const today = new OrganizationTodayPage(page);

    await today.goto(E2E_ORGANIZATION_ID);
    await today.queueSeeAllButton('overdue').click();
    await expect(page).toHaveURL(
      new RegExp(`/organizations/${E2E_ORGANIZATION_ID}/interventions\\?due=overdue$`),
    );

    await today.goto(E2E_ORGANIZATION_ID);
    await today.queueSeeAllButton('changes-requested').click();
    await expect(page).toHaveURL(
      new RegExp(`/organizations/${E2E_ORGANIZATION_ID}/interventions\\?status=changes_requested$`),
    );

    await today.goto(E2E_ORGANIZATION_ID);
    await today.queueSeeAllButton('awaiting-review').click();
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
    const today = new OrganizationTodayPage(page);

    await today.goto(E2E_ORGANIZATION_ID);

    await expect(today.allClearState).toBeVisible();
    await expect(today.kpiSection).toBeVisible();
    await expect(today.kpiTile('open-interventions')).toContainText('7');
    await expect(page.getByText('FG-305')).toBeVisible();
    await expect(page.getByText('Service rooftop pump')).toBeVisible();
  });

  test('links a recently updated intervention row to its detail route', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockFullDashboard(api);
    await mockPopulatedQueues(api);
    const today = new OrganizationTodayPage(page);

    await today.goto(E2E_ORGANIZATION_ID);

    await today.openRecentIntervention('Replace corridor extinguisher');

    await expect(page).toHaveURL(
      `/organizations/${E2E_ORGANIZATION_ID}/interventions/e2e-intervention-recent-1`,
    );
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
    const today = new OrganizationTodayPage(page);

    await today.goto(E2E_ORGANIZATION_ID);

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(today.root).toBeVisible();
    await expect(today.kpiSection).toBeVisible();
    await expect(today.alertsSection).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await screenshotFullContent(page, today.root, `${SCREENSHOT_DIR}/today-dark-mobile.png`);
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  });

  test('renders on desktop in light mode', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await mockFullDashboard(api);
    await mockPopulatedQueues(api);
    const today = new OrganizationTodayPage(page);

    await today.goto(E2E_ORGANIZATION_ID);

    await expect(today.root).toBeVisible();
    await expect(today.kpiSection).toBeVisible();
    await screenshotFullContent(page, today.root, `${SCREENSHOT_DIR}/today-light-desktop.png`);
  });
});
