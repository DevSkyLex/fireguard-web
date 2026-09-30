import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { interventionStatisticsOutput } from '../support/fixtures/intervention-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * The sidebar's active-row contract.
 *
 * `routerLinkActive` matches by prefix unless told otherwise, and the Dashboard
 * row's route is the workspace root — a prefix of every sibling. Its exactness
 * used to be inferred from `link.id === 'today'`, an id that no longer exists,
 * so the condition was always false and the row was marked current on every
 * page of the workspace, announcing two current pages to a screen reader.
 */

const CURRENT = '#dashboard-layout [aria-current="page"]';

test.describe('Organization navigation', () => {
  test('marks exactly one row current on a sub-route', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockInterventionStatistics(interventionStatisticsOutput());
    await api.mockInterventionList(E2E_ORGANIZATION_ID, []);
    await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
    await api.mockInterventionTemplates(E2E_ORGANIZATION_ID, []);
    await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
    await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);

    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/interventions`);

    await expect(page.locator(CURRENT)).toHaveCount(1);
    await expect(page.locator(CURRENT)).toContainText('Interventions');
  });

  test('marks the Dashboard row current only on the workspace root', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();

    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}`);

    await expect(page.locator(CURRENT)).toHaveCount(1);
    await expect(page.locator(CURRENT)).toContainText('Dashboard');
  });
});
