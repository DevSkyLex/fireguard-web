import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  E2E_MEMBER_IRI,
  interventionIssueOutput,
  interventionOutput,
  interventionWorkItemOutput,
} from '../support/fixtures/intervention-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { InterventionDetailPage } from '../support/pages/intervention-detail.page';

const interventionId = 'e2e-detail-checklist-1';
const workItemId = 'e2e-detail-checklist-work-item-1';

const intervention = interventionOutput({
  id: interventionId,
  '@id': `/api/interventions/${interventionId}`,
  number: 401,
  name: 'Riser inspection in progress',
  status: 'in_progress',
  responsible: E2E_MEMBER_IRI,
  allowedTransitions: ['submitted', 'changes_requested', 'abandoned'],
  workItemsCount: 1,
  completedWorkItemsCount: 0,
});

const remainingWorkItem = interventionWorkItemOutput({
  id: workItemId,
  '@id': `/api/intervention-work-items/${workItemId}`,
  intervention: `/api/interventions/${interventionId}`,
  action: 'site_setup',
  status: 'planned',
  required: true,
});

const blockerIssue = interventionIssueOutput({
  resource: `/api/interventions/${interventionId}`,
  field: null,
  message: 'One required work item is still open.',
});

/** Registers the session and every read the detail route's workspace + planning-options bursts fire on load. */
async function mockDetailPage(api: ApiMock): Promise<void> {
  await api.mockAuthenticatedSession();
  await api.mockInterventionDetail(intervention);
  await api.mockInterventionWorkItems(interventionId, [remainingWorkItem]);
  await api.mockInterventionChanges(interventionId, []);
  await api.mockInterventionIssues(interventionId, [blockerIssue]);
  await api.mockInterventionActivities(interventionId, []);
  await api.mockInterventionAttachments(interventionId, []);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockEquipmentList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
}

test.describe('Intervention detail — blocker checklist through to the submit gate', () => {
  test('routes a blocker to the field-work section, and clears once the work item is complete and the issues refresh empty', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await mockDetailPage(api);
    const detail = new InterventionDetailPage(page);

    await detail.goto(E2E_ORGANIZATION_ID, interventionId);

    await expect(detail.issuesChecklist).toBeVisible();
    await expect(detail.issuesChecklist).toContainText('One required work item is still open.');

    await detail.activateFirstBlocker();

    await expect(detail.fieldWorkSection).toBeFocused();

    await api.mockInterventionWorkItemUpdate(workItemId, {
      ...remainingWorkItem,
      status: 'completed',
      revision: remainingWorkItem.revision + 1,
    });

    await detail.toggleWorkItem('Site setup');

    await expect(detail.workItemToggle('Site setup')).toHaveAttribute('aria-pressed', 'true');

    await expect(detail.commandButton).toContainText('Submit for review');
    await expect(detail.commandButton).toBeEnabled();

    const completedWorkItem = {
      ...remainingWorkItem,
      status: 'completed',
      revision: remainingWorkItem.revision + 1,
    };
    await api.mockInterventionWorkItems(interventionId, [completedWorkItem]);
    await api.mockInterventionIssues(interventionId, []);
    await page.reload();

    await expect(detail.commandButton).toContainText('Submit for review');
    await expect(detail.commandButton).toBeEnabled();
    await expect(detail.issuesChecklist).toHaveCount(0);
  });
});
