import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  interventionOutput,
  interventionStatisticsOutput,
} from '../support/fixtures/intervention-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { InterventionsPage } from '../support/pages/interventions.page';

const CREATED_ID = 'e2e-intervention-created';
const createdIntervention = interventionOutput({
  id: CREATED_ID,
  '@id': `/api/interventions/${CREATED_ID}`,
  number: 901,
  name: 'Autumn extinguisher round',
});

/** Registers the list route's own read burst — statistics, the collection, labels, sites and members for the create sheet's pickers. */
async function mockListPage(api: ApiMock): Promise<void> {
  await api.mockAuthenticatedSession();
  await api.mockInterventionStatistics(interventionStatisticsOutput());
  await api.mockInterventionList(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
}

/** Registers the detail route's own read burst — the resource plus every parallel read the workspace store fires on load. */
async function mockDetailPage(api: ApiMock): Promise<void> {
  await api.mockInterventionDetail(createdIntervention);
  await api.mockInterventionWorkItems(createdIntervention.id, []);
  await api.mockInterventionChanges(createdIntervention.id, []);
  await api.mockInterventionIssues(createdIntervention.id, []);
  await api.mockInterventionActivities(createdIntervention.id, []);
  await api.mockInterventionAttachments(createdIntervention.id, []);
  await api.mockEquipmentList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
}

test.describe('Creating an intervention from the list page', () => {
  test('opens the creation sheet from "New intervention", submits a name, and lands on the new intervention\'s detail page', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await mockListPage(api);
    await api.mockInterventionCreate(createdIntervention);
    await mockDetailPage(api);

    const interventions = new InterventionsPage(page);
    await interventions.goto(E2E_ORGANIZATION_ID);

    await page.getByTestId('interventions-new').click();
    await expect(interventions.createSheet).toBeVisible();

    await page.getByTestId('intervention-create-name').fill(createdIntervention.name);
    await page.getByTestId('intervention-create-submit').click();

    await expect(page).toHaveURL(
      new RegExp(`/organizations/${E2E_ORGANIZATION_ID}/interventions/${CREATED_ID}$`),
      { timeout: 10_000 },
    );
    await expect(page.locator('#intervention-detail')).toBeVisible();
  });
});
