import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  interventionOutput,
  interventionStatisticsOutput,
} from '../support/fixtures/intervention-fixtures';
import { collectConsoleErrors, expectNoHorizontalOverflow } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { InterventionsPage } from '../support/pages/interventions.page';

/**
 * The suite's first `*.mobile.spec.ts`: it runs under the `Mobile Chrome` and
 * `Mobile Safari` projects only, so it is the first coverage in this repo with
 * real touch input, `pointer: coarse` and a mobile user agent rather than a
 * desktop browser resized to a phone's width.
 *
 * It also exercises the two harness repairs it depends on — the
 * `/api/interventions/statistics` mock, without which every KPI tile silently
 * renders zero, and `expectNoInternalOverflow`, which sees the overflow
 * `expectNoHorizontalOverflow` structurally cannot.
 */

const INTERVENTIONS = [
  interventionOutput({
    id: 'e2e-mobile-1',
    '@id': '/api/interventions/e2e-mobile-1',
    number: 401,
    name: 'Quarterly extinguisher round — north depot, level 3',
    status: 'planned',
  }),
  interventionOutput({
    id: 'e2e-mobile-2',
    '@id': '/api/interventions/e2e-mobile-2',
    number: 402,
    name: 'Sprinkler riser inspection',
    status: 'in_progress',
  }),
];

async function gotoList(page: Parameters<typeof collectConsoleErrors>[0]): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockInterventionStatistics(interventionStatisticsOutput());
  await api.mockInterventionList(E2E_ORGANIZATION_ID, INTERVENTIONS);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionTemplates(E2E_ORGANIZATION_ID, []);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);

  /*
   * `InterventionPrefetchService` warms an offline workspace for every row the
   * list returns, so the three workspace reads fire once per fixture even
   * though this spec never opens a detail page. Left unmocked they answer 404
   * through the safety net, which is invisible until a spec asserts on the
   * console — no existing interventions spec does.
   */
  await api.mockInterventionWorkItems(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionChanges(E2E_ORGANIZATION_ID, []);
  await Promise.all(
    INTERVENTIONS.map((intervention) => api.mockInterventionIssues(intervention.id, [])),
  );

  await new InterventionsPage(page).goto(E2E_ORGANIZATION_ID);
}

test.describe('Interventions list on a phone', () => {
  test('renders the KPI strip from the statistics endpoint', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await gotoList(page);

    // 9 open of 20 total: in_progress 3 + planned 5 + changes_requested 1.
    await expect(page.getByTestId('intervention-kpi-strip-open')).toContainText('9');
    await expect(page.getByTestId('intervention-kpi-strip-overdue')).toContainText('4');
    await expect(page.getByTestId('intervention-kpi-strip-awaiting-review')).toContainText('2');
    expect(consoleErrors).toEqual([]);
  });

  test('does not scroll the document sideways', async ({ page }) => {
    await gotoList(page);

    await expect(page.getByTestId('intervention-table-card')).toHaveCount(INTERVENTIONS.length);
    await expectNoHorizontalOverflow(page);
  });

  /*
   * The collection surface landed: below its `@2xl` container breakpoint the
   * table is gone and the rows render as cards, so there is no inner scroller
   * left to hide the row menu behind. This used to be a `test.fail()`.
   */
  test('renders the collection as cards, not as a sideways-scrolling table', async ({ page }) => {
    await gotoList(page);

    await expect(page.getByTestId('intervention-table')).toHaveCount(0);
    await expect(page.getByTestId('intervention-table-cards')).toBeVisible();
    await expect(page.getByTestId('intervention-table-card')).toHaveCount(INTERVENTIONS.length);
    await expectNoHorizontalOverflow(page);
  });
});
