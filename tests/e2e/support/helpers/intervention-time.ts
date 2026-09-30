import type { Page } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../fixtures/api-fixtures';
import { E2E_INTERVENTION_ID, interventionWorkItemOutput } from '../fixtures/intervention-fixtures';
import { organizationMemberOutput } from '../fixtures/member-fixtures';
import { WorkloadApiMock } from '../mocks/workload-api-mock';
import { arrangeInterventionTables } from './intervention-detail-tables';

/** Authorized task and independent journal, without application-state injection. */
export async function arrangeInterventionTime(page: Page) {
  const mock = new WorkloadApiMock(page);
  const item = interventionWorkItemOutput({
    target: null,
    action: 'inventory',
    estimatedMinutes: 300,
    remainingMinutes: 180,
    spentMinutes: 0,
    allowedActions: {
      canLogTime: true,
      canManageTime: false,
      canExecute: true,
      canReestimate: true,
      canReassign: true,
      canEditPlanning: true,
    },
  });
  const path = await arrangeInterventionTables(page, true, async (api) => {
    await api.mockInterventionWorkItems(E2E_INTERVENTION_ID, [item]);
    await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, [organizationMemberOutput()]);
    await mock.timeJournal(item.id);
  });
  return { path, mock, item };
}

/** Opens the same contextual row action in desktop and tactile representations. */
export async function openTimeJournal(page: Page): Promise<void> {
  await page
    .getByTestId(/^intervention-work-item-menu(-card)?$/)
    .filter({ visible: true })
    .click();
  await page.getByRole('menuitem', { name: 'Time journal', exact: true }).click();
}
