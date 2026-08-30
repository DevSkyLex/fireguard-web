import { expect, test, type Page } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  interventionOutput,
  interventionStatisticsOutput,
} from '../support/fixtures/intervention-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { readStore, setAppOffline } from '../support/helpers/offline';
import { ApiMock } from '../support/mocks/api-mock';
import { InterventionsPage } from '../support/pages/interventions.page';

/**
 * The list is the product's entry point, and until now it was the one surface
 * blind to connectivity: the workspace fell back to the device snapshot while
 * the list that leads to it answered "check your connection", which made every
 * cached intervention unreachable by navigation.
 *
 * This spec never hand-seeds IndexedDB. It walks the real path — load online so
 * the app persists what it fetched, then cut the network — because a seed would
 * prove the fallback reads a store, not that the store is ever filled.
 */

const SCREENSHOT_DIR =
  'C:/Users/valen/AppData/Local/Temp/claude/G--Projets-fireguard-fireguard-sso-web/a35735d3-97bd-4e28-99cd-082456b11e86/scratchpad/screenshots';

const INTERVENTIONS = [
  interventionOutput({
    id: 'e2e-offline-1',
    '@id': '/api/interventions/e2e-offline-1',
    number: 511,
    name: 'Extinguisher round — cold store',
    status: 'planned',
  }),
  interventionOutput({
    id: 'e2e-offline-2',
    '@id': '/api/interventions/e2e-offline-2',
    number: 512,
    name: 'Riser pressure check',
    status: 'in_progress',
  }),
];

/**
 * Cuts the network only once the device snapshot actually exists. The list
 * renders before `InterventionPrefetchService` has finished writing to
 * IndexedDB, so going offline on the rendered rows alone races the write —
 * reproducibly on webkit under parallel workers.
 */
async function goOfflineOnceSnapshotted(page: Page): Promise<void> {
  await expect
    .poll(async () => (await readStore(page, 'interventions')).length, { timeout: 10_000 })
    .toBeGreaterThan(0);
  await setAppOffline(page);
  await page.route('**/api/interventions**', (route) => route.abort('internetdisconnected'));
  await page.reload();
}

async function gotoListOnline(page: Page): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockInterventionStatistics(interventionStatisticsOutput());
  await api.mockInterventionList(E2E_ORGANIZATION_ID, INTERVENTIONS);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionTemplates(E2E_ORGANIZATION_ID, []);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionWorkItems(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionChanges(E2E_ORGANIZATION_ID, []);
  await Promise.all(
    INTERVENTIONS.map((intervention) => api.mockInterventionIssues(intervention.id, [])),
  );

  await new InterventionsPage(page).goto(E2E_ORGANIZATION_ID);
}

test.describe('Interventions list without a network', () => {
  test('serves the device snapshot and says so, instead of an error state', async ({ page }) => {
    const interventions = new InterventionsPage(page);
    await gotoListOnline(page);
    await expect(interventions.tableRows).toHaveCount(INTERVENTIONS.length);

    await goOfflineOnceSnapshotted(page);

    await expect(interventions.tableRows).toHaveCount(INTERVENTIONS.length);
    await expect(page.getByTestId('interventions-offline-notice')).toBeVisible();
    await expect(page.locator('app-error-state')).toHaveCount(0);
    /*
     * The statistics endpoint is unreachable too, so the KPI tiles have no
     * figures. Rendering them anyway printed a confident "Nothing overdue" over
     * four zeroes — an assertion the app cannot make offline.
     */
    await expect(page.getByTestId('intervention-kpi-strip-overdue')).toHaveCount(0);
  });

  test('closes the export gate with a reason rather than silently', async ({ page }) => {
    const interventions = new InterventionsPage(page);
    await gotoListOnline(page);
    // The snapshot only exists once the online list has actually rendered.
    await expect(interventions.tableRows).toHaveCount(INTERVENTIONS.length);

    await goOfflineOnceSnapshotted(page);

    await expect(page.getByTestId('interventions-offline-notice')).toBeVisible();

    const exportButton = page.getByTestId('interventions-export');
    await expect(exportButton).toBeDisabled();
    const describedBy = await exportButton.getAttribute('aria-describedby');
    expect(describedBy, 'the closed export gate must name its reason').not.toBeNull();
    await expect(page.locator(`#${describedBy}`)).toContainText(/device|offline/i);
  });

  test('renders the offline roster at 375px in dark mode', async ({ page, context, baseURL }) => {
    const consoleErrors = collectConsoleErrors(page);
    await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await page.setViewportSize({ width: 375, height: 800 });

    const interventions = new InterventionsPage(page);
    await gotoListOnline(page);
    await expect(page.getByTestId('intervention-table-card')).toHaveCount(INTERVENTIONS.length);

    await goOfflineOnceSnapshotted(page);

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByTestId('interventions-offline-notice')).toBeVisible();
    await expect(interventions.root).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: SCREENSHOT_DIR + '/interventions-offline-dark-375.png' });
    /*
     * The aborted list request logs its own failure by design — that is the
     * scenario. Anything else on the console is a real defect.
     */
    const unexpected = consoleErrors.filter(
      (message) => !message.includes('ERR_INTERNET_DISCONNECTED'),
    );
    expect(unexpected, unexpected.join('\n')).toEqual([]);
  });

  test('renders the offline roster at 1280px in light mode', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const interventions = new InterventionsPage(page);
    await gotoListOnline(page);
    await expect(interventions.tableRows).toHaveCount(INTERVENTIONS.length);

    await goOfflineOnceSnapshotted(page);

    await expect(page.getByTestId('interventions-offline-notice')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: SCREENSHOT_DIR + '/interventions-offline-light-1280.png' });
  });
});
