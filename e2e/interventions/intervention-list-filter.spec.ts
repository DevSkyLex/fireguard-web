import { expect, test, type Page } from '@playwright/test';
import { hydraCollection, organizationOutput } from '../support/fixtures/api-fixtures';
import { interventionOutput } from '../support/fixtures/intervention-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * The intervention list toolbar (`/interventions`).
 *
 * The list filters **server-side**: the collection is paginated, so trimming
 * the page already in memory would hide matches sitting on page two. That makes
 * the query string the only observable contract — and the only way to see it is
 * to read the requests the browser actually sends. A unit spec can assert that
 * the store was called; it cannot prove the parameter left the machine, nor
 * that PrimeNG's overlay lets anyone pick a status in the first place.
 */
const ORGANIZATION = organizationOutput();

const INTERVENTIONS = [
  interventionOutput({ id: 'i-planned', name: 'Quarterly extinguisher round', status: 'planned' }),
  interventionOutput({ id: 'i-draft', name: 'Warehouse survey', status: 'draft' }),
];

/**
 * Query strings of every `GET /api/interventions` collection read the page has
 * issued, in order. The detail endpoint (`/api/interventions/{id}`) is excluded
 * so only list reads are recorded.
 */
async function landOnList(page: Page): Promise<string[]> {
  const listQueries: string[] = [];

  const api = new ApiMock(page);
  await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
  await api.mockOrganizationDetail(ORGANIZATION);
  await api.mockOrganizationAccess(ORGANIZATION.id);
  await api.mockInterventionPlanningOptions(ORGANIZATION.id);

  await page.route(/\/api\/interventions(\?.*)?$/, async (route) => {
    listQueries.push(new URL(route.request().url()).search);
    await route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify(hydraCollection(INTERVENTIONS)),
    });
  });
  await page.route(/\/api\/intervention-types(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/ld+json',
      body: JSON.stringify(hydraCollection([])),
    });
  });

  await page.goto(`/organizations/${ORGANIZATION.id}/interventions`);
  await expect(page.getByTestId('intervention-status-filter')).toBeVisible();

  return listQueries;
}

test.describe('Intervention list status filter', () => {
  test('sends the chosen status to the API and puts it in the URL', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const listQueries = await landOnList(page);

    const before = listQueries.length;
    await page.getByTestId('intervention-status-filter').click();
    await page.getByRole('option', { name: 'Planned', exact: true }).click();

    await expect(page).toHaveURL(/[?&]status=planned/);
    await expect
      .poll(() => listQueries.slice(before).some((query) => query.includes('status=planned')))
      .toBe(true);
  });

  test('drops the parameter when the filter is cleared', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const listQueries = await landOnList(page);

    await page.getByTestId('intervention-status-filter').click();
    await page.getByRole('option', { name: 'Planned', exact: true }).click();
    await expect(page).toHaveURL(/[?&]status=planned/);

    const before = listQueries.length;
    await page.locator('[data-testid="intervention-status-filter"] .p-select-clear-icon').click();

    await expect(page).not.toHaveURL(/[?&]status=/);
    await expect
      .poll(() => listQueries.slice(before).some((query) => !query.includes('status=')))
      .toBe(true);
  });

  // A filter restored from a shared link must show what it is filtering on,
  // otherwise the recipient reads a short list as an empty estate.
  test('reflects a status arriving from the URL', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [ORGANIZATION] });
    await api.mockOrganizationDetail(ORGANIZATION);
    await api.mockOrganizationAccess(ORGANIZATION.id);
    await api.mockInterventionPlanningOptions(ORGANIZATION.id);

    const listQueries: string[] = [];
    await page.route(/\/api\/interventions(\?.*)?$/, async (route) => {
      listQueries.push(new URL(route.request().url()).search);
      await route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify(hydraCollection([INTERVENTIONS[0]])),
      });
    });
    await page.route(/\/api\/intervention-types(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/ld+json',
        body: JSON.stringify(hydraCollection([])),
      });
    });

    await page.goto(`/organizations/${ORGANIZATION.id}/interventions?status=planned`);

    await expect(page.getByTestId('intervention-status-filter')).toContainText('Planned');
    await expect.poll(() => listQueries.some((q) => q.includes('status=planned'))).toBe(true);
  });
});
