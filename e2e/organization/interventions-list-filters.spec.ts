import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  E2E_MEMBER_IRI,
  interventionLabelOutput,
  interventionOutput,
  interventionStatisticsOutput,
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
const submittedIntervention = interventionOutput({
  id: 'e2e-list-submitted',
  '@id': '/api/interventions/e2e-list-submitted',
  number: 205,
  name: 'Kitchen suppression system check',
  status: 'submitted',
});

const ALL_FIXTURES = [
  myPlannedIntervention,
  otherPlannedIntervention,
  inProgressIntervention,
  labeledIntervention,
  submittedIntervention,
];

/** Registers the session, the list itself and the planning-options burst the filter bar/create sheet both read. */
async function mockListPage(api: ApiMock): Promise<void> {
  await api.mockAuthenticatedSession();
  await api.mockInterventionStatistics(interventionStatisticsOutput());
  await api.mockInterventionList(E2E_ORGANIZATION_ID, ALL_FIXTURES);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, [labelOutput]);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
}

test.describe('Interventions list — statistics analysis', () => {
  /*
   * `InterventionStatisticsAnalysis` renders everything the KPI strip does not
   * — the priority split, the top sites and responsibles, the average
   * publication delay — from a payload the store already fetches on every
   * organization switch. It shipped complete, specced, and mounted nowhere:
   * its selector appeared in no template in the repository.
   */
  test('offers the analysis disclosure beside the KPI strip', async ({ page }) => {
    const api = new ApiMock(page);
    await mockListPage(api);
    const interventions = new InterventionsPage(page);

    await interventions.goto(E2E_ORGANIZATION_ID);

    const trigger = page.getByTestId('intervention-statistics-analysis-trigger');
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});

test.describe('Interventions list — shared filtered URL', () => {
  test('renders only the matching fixtures for a shared status+mine URL, showing a Status chip and the mine toggle pressed', async ({
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

    await expect(interventions.filterChip('Status')).toBeVisible();
    await expect(interventions.mineToggle).toHaveAttribute('aria-pressed', 'true');

    await expect(interventions.filtersToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(interventions.filtersToggle.locator('hlm-badge')).toHaveText('1');
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
    await expect(interventions.filterChip('Label')).toBeVisible();
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

  test('shows exactly one sync indicator, contributed by the shell header, with no page-local copy', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await mockListPage(api);
    const interventions = new InterventionsPage(page);

    await interventions.goto(E2E_ORGANIZATION_ID);

    await expect(interventions.syncIndicatorTrigger).toBeVisible();
    await expect(page.getByTestId('intervention-sync-status')).toHaveCount(1);
    await expect(interventions.root.getByTestId('intervention-sync-status')).toHaveCount(0);
  });
});

test.describe('Interventions list — filter chips', () => {
  test("a direct ?due=overdue link (the KPI strip's overdue tile) narrows the request to the server-side overdue preset", async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await mockListPage(api);
    const interventions = new InterventionsPage(page);

    const overdueRequest = page.waitForRequest(
      (request) =>
        /\/api\/interventions(\?.*)?$/.test(request.url()) &&
        new URL(request.url()).searchParams.has('due'),
    );

    await interventions.gotoWithQuery(E2E_ORGANIZATION_ID, 'due=overdue');

    const request = await overdueRequest;
    expect(new URL(request.url()).searchParams.get('due')).toBe('overdue');
  });

  test("a direct ?status=submitted link (the KPI strip's awaiting-review tile) renders only the matching fixture", async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await mockListPage(api);
    const interventions = new InterventionsPage(page);

    await interventions.gotoWithQuery(E2E_ORGANIZATION_ID, 'status=submitted');

    await expect(interventions.row('Kitchen suppression system check')).toBeVisible();
    await expect(interventions.row('Riser check assigned to me')).toHaveCount(0);
    await expect(interventions.row('Sprinkler head replacement')).toHaveCount(0);
    await expect(interventions.filterChip('Status')).toBeVisible();
  });

  test('renders the filter bar collapsed with no badge when arriving with no active filter', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await mockListPage(api);
    const interventions = new InterventionsPage(page);

    await interventions.goto(E2E_ORGANIZATION_ID);

    await expect(interventions.filtersToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(interventions.filtersToggle.locator('hlm-badge')).toHaveCount(0);
    await expect(interventions.filterChips).toHaveCount(0);

    await interventions.openFilters();

    await expect(interventions.filtersToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(interventions.addFilterTrigger).toBeVisible();
  });

  test('adding a status filter from the "+ Filter" menu shows an editable chip, and removing it clears the param', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await mockListPage(api);
    const interventions = new InterventionsPage(page);

    await interventions.goto(E2E_ORGANIZATION_ID);
    await interventions.openFilters();
    await interventions.addFilter('Status');
    await page.getByRole('option', { name: 'Planned' }).click();

    await expect(page).toHaveURL(/[?&]status=planned(&|$)/);
    await expect(interventions.filterChip('Status')).toBeVisible();
    await expect(interventions.filterChip('Status')).toContainText('Planned');

    await interventions.removeFilterChip('Status');

    await expect(page).not.toHaveURL(/status=planned/);
    await expect(interventions.filterChip('Status')).toHaveCount(0);
  });

  test('clicking a chip’s value segment reopens its selector to change the value, without removing the chip', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await mockListPage(api);
    const interventions = new InterventionsPage(page);

    await interventions.gotoWithQuery(E2E_ORGANIZATION_ID, 'status=planned');

    await expect(interventions.filterChip('Status')).toContainText('Planned');

    await interventions.openFilterChipValue('interventions-filter-status');
    await page.getByRole('option', { name: 'In progress' }).click();

    await expect(page).toHaveURL(/[?&]status=in_progress(&|$)/);
    await expect(interventions.filterChip('Status')).toContainText('In progress');
    await expect(interventions.filterChips).toHaveCount(1);
  });

  test('"Clear filters" is reachable from the chip row now that it has moved out of the popover', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await mockListPage(api);
    const interventions = new InterventionsPage(page);

    await interventions.gotoWithQuery(E2E_ORGANIZATION_ID, 'status=planned&mine=1');

    await expect(interventions.clearFiltersButton).toBeVisible();
    await interventions.clearFiltersButton.click();

    await expect(page).toHaveURL(
      new RegExp(`/organizations/${E2E_ORGANIZATION_ID}/interventions$`),
    );
    await expect(interventions.filterChips).toHaveCount(0);
  });
});
