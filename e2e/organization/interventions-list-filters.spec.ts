import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  E2E_MEMBER_IRI,
  interventionLabelOutput,
  interventionOutput,
} from '../support/fixtures/intervention-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { InterventionsPage } from '../support/pages/interventions.page';

const labelOutput = interventionLabelOutput({ id: 'e2e-label-1', name: 'Compliance' });
const labelIri = `/api/intervention-labels/${labelOutput.id}`;

const myPlannedIntervention = interventionOutput({
  id: 'e2e-list-mine',
  '@id': '/api/interventions/e2e-list-mine',
  number: 201,
  name: 'Riser check assigned to me',
  status: 'planned',
  responsible: E2E_MEMBER_IRI,
});
const otherPlannedIntervention = interventionOutput({
  id: 'e2e-list-other',
  '@id': '/api/interventions/e2e-list-other',
  number: 202,
  name: 'Riser check assigned to someone else',
  status: 'planned',
  responsible: null,
});
const inProgressIntervention = interventionOutput({
  id: 'e2e-list-progress',
  '@id': '/api/interventions/e2e-list-progress',
  number: 203,
  name: 'Sprinkler head replacement',
  status: 'in_progress',
});
const labeledIntervention = interventionOutput({
  id: 'e2e-list-labeled',
  '@id': '/api/interventions/e2e-list-labeled',
  number: 204,
  name: 'Annual alarm compliance check',
  status: 'planned',
  labels: [labelIri],
});

const ALL_FIXTURES = [
  myPlannedIntervention,
  otherPlannedIntervention,
  inProgressIntervention,
  labeledIntervention,
];

/** Registers the session, the list itself and the planning-options burst the filter bar/create sheet both read. */
async function mockListPage(api: ApiMock): Promise<void> {
  await api.mockAuthenticatedSession();
  await api.mockInterventionList(E2E_ORGANIZATION_ID, ALL_FIXTURES);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, [labelOutput]);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
}

test.describe('Interventions list — shared filtered URL', () => {
  test('renders only the matching fixtures for a shared status+mine URL, counting mine separately in the Filters badge', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await mockListPage(api);
    const interventions = new InterventionsPage(page);

    await interventions.gotoWithQuery(E2E_ORGANIZATION_ID, 'status=planned&mine=1');

    await expect(interventions.row('Riser check assigned to me')).toBeVisible();
    await expect(interventions.row('Riser check assigned to someone else')).toHaveCount(0);
    await expect(interventions.row('Sprinkler head replacement')).toHaveCount(0);
    await expect(interventions.row('Annual alarm compliance check')).toHaveCount(0);

    await expect(interventions.filtersTrigger).toContainText('1');
    await expect(interventions.mineToggle).toHaveAttribute('aria-pressed', 'true');
  });

  test('renders only the matching fixture for a shared label URL', async ({ page }) => {
    const api = new ApiMock(page);
    await mockListPage(api);
    const interventions = new InterventionsPage(page);

    await interventions.gotoWithQuery(E2E_ORGANIZATION_ID, `label=${labelOutput.id}`);

    await expect(interventions.row('Annual alarm compliance check')).toBeVisible();
    await expect(interventions.row('Riser check assigned to me')).toHaveCount(0);
    await expect(interventions.row('Riser check assigned to someone else')).toHaveCount(0);
    await expect(interventions.row('Sprinkler head replacement')).toHaveCount(0);
    await expect(interventions.filtersTrigger).toContainText('1');
  });

  test('still opens the creation sheet on ?create=1, the contract the landing page relies on', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await mockListPage(api);
    const interventions = new InterventionsPage(page);

    await interventions.gotoWithQuery(E2E_ORGANIZATION_ID, 'create=1');

    await expect(interventions.createSheet).toBeVisible();
    await expect(page).toHaveURL(
      new RegExp(`/organizations/${E2E_ORGANIZATION_ID}/interventions$`),
    );
  });
});
