import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { interventionOutput } from '../support/fixtures/intervention-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { InterventionsPage } from '../support/pages/interventions.page';

const eligibleSucceeds = interventionOutput({
  id: 'e2e-move-a',
  '@id': '/api/interventions/e2e-move-a',
  number: 301,
  name: 'Move A eligible succeeds',
  status: 'planned',
  responsible: `/api/organizations/${E2E_ORGANIZATION_ID}/members/e2e-member-1`,
  allowedTransitions: ['in_progress', 'abandoned'],
});
const eligibleFails = interventionOutput({
  id: 'e2e-move-b',
  '@id': '/api/interventions/e2e-move-b',
  number: 302,
  name: 'Move B eligible fails',
  status: 'planned',
  responsible: `/api/organizations/${E2E_ORGANIZATION_ID}/members/e2e-member-1`,
  allowedTransitions: ['in_progress', 'abandoned'],
});
const ineligible = interventionOutput({
  id: 'e2e-move-c',
  '@id': '/api/interventions/e2e-move-c',
  number: 303,
  name: 'Move C not eligible',
  status: 'draft',
  allowedTransitions: [],
});

test.describe('Interventions list — bulk "Move to" with a mixed selection', () => {
  test('moves only the eligible rows, rolling back the one PATCH the server refuses and toasting the failure', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockInterventionList(E2E_ORGANIZATION_ID, [
      eligibleSucceeds,
      eligibleFails,
      ineligible,
    ]);
    await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
    await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
    await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
    await api.mockInterventionTransition(eligibleSucceeds.id, {
      ...eligibleSucceeds,
      status: 'in_progress',
      revision: eligibleSucceeds.revision + 1,
      allowedTransitions: ['submitted', 'changes_requested', 'abandoned'],
    });
    await api.mockInterventionTransitionError(eligibleFails.id, { status: 409 });

    const interventions = new InterventionsPage(page);
    await interventions.goto(E2E_ORGANIZATION_ID);

    await interventions.selectRow('Move A eligible succeeds');
    await interventions.selectRow('Move B eligible fails');
    await interventions.selectRow('Move C not eligible');

    await interventions.openBulkActions();
    await expect(interventions.bulkTransitionEntry('In progress')).toContainText('(2)');

    await interventions.chooseBulkTransition('In progress');

    await expect(interventions.rowStatus('Move A eligible succeeds')).toContainText('In progress');
    await expect(interventions.rowStatus('Move B eligible fails')).toContainText('Planned');
    await expect(interventions.rowStatus('Move C not eligible')).toContainText('Draft');

    await expect(page.getByTestId('interventions-batch-result')).toBeVisible();
    await expect(page.getByTestId('interventions-batch-result')).toContainText(
      '1 succeeded · 1 failed · 2 eligible',
    );
    await expect(
      interventions
        .row('Move A eligible succeeds')
        .getByTestId('intervention-table-row-select')
        .getByRole('checkbox'),
    ).not.toBeChecked();
    await expect(
      interventions
        .row('Move B eligible fails')
        .getByTestId('intervention-table-row-select')
        .getByRole('checkbox'),
    ).toBeChecked();
    await api.mockInterventionTransition(eligibleFails.id, {
      ...eligibleFails,
      status: 'in_progress',
      revision: 2,
    });
    const retried: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'PATCH') retried.push(request.url());
    });
    await page.getByRole('button', { name: 'Retry failed interventions' }).click();
    await expect(page.getByTestId('interventions-batch-result')).toContainText(
      '1 succeeded · 0 failed · 1 eligible',
    );
    expect(retried).toHaveLength(1);
    expect(retried[0]).toContain(eligibleFails.id);
  });
});
