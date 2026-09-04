import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  E2E_MEMBER_IRI,
  interventionOutput,
  interventionStatisticsOutput,
} from '../support/fixtures/intervention-fixtures';
import { expectSheetGuardHolds } from '../support/helpers/sheet-guard';
import { ApiMock } from '../support/mocks/api-mock';
import { InterventionDetailPage } from '../support/pages/intervention-detail.page';
import { InterventionsPage } from '../support/pages/interventions.page';

/**
 * Every form-bearing sheet confirms before it discards a dirty draft. The unit
 * specs prove each sheet's guard against a stubbed form; this proves the real
 * wiring the stub stands in for — a live Signal Forms field emitting
 * `dirtyChanged` from actual user input, through the sheet, to the shared
 * `@shared/unsaved-changes` dialog — in both engines. Each sheet's own close
 * gesture is exercised: Escape on the two sheets whose first field is text, and
 * the Cancel button on the select-only work-item sheet, whose brain select
 * overlay captures the Escape key before it can reach the sheet. Both gestures
 * land on the same `requestClose`/`onStateChanged` guard.
 */

const interventionId = 'e2e-guard-1';

async function mockOrganizationReads(api: ApiMock): Promise<void> {
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockEquipmentList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
}

async function mockListPage(api: ApiMock): Promise<void> {
  await api.mockAuthenticatedSession();
  await api.mockInterventionStatistics(interventionStatisticsOutput());
  await api.mockInterventionList(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionTemplates(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionWorkItems(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionChanges(E2E_ORGANIZATION_ID, []);
  await mockOrganizationReads(api);
}

async function mockDetailPage(api: ApiMock, status: 'in_progress' | 'submitted'): Promise<void> {
  await api.mockAuthenticatedSession();
  await api.mockInterventionDetail(
    interventionOutput({
      id: interventionId,
      '@id': `/api/interventions/${interventionId}`,
      number: 904,
      name: 'Annual sprinkler riser inspection',
      status,
      responsible: E2E_MEMBER_IRI,
      allowedTransitions:
        status === 'submitted' ? ['published', 'changes_requested'] : ['submitted', 'abandoned'],
      workItemsCount: 0,
      completedWorkItemsCount: 0,
    }),
  );
  await api.mockInterventionWorkItems(interventionId, []);
  await api.mockInterventionChanges(interventionId, []);
  await api.mockInterventionIssues(interventionId, []);
  await api.mockInterventionActivities(interventionId, []);
  await api.mockInterventionAttachments(interventionId, []);
  await mockOrganizationReads(api);
}

test.describe('Form sheets confirm before discarding a dirty draft', () => {
  test('the create sheet keeps a started draft that Escape would discard', async ({ page }) => {
    const api = new ApiMock(page);
    await mockListPage(api);

    const list = new InterventionsPage(page);
    await list.goto(E2E_ORGANIZATION_ID);
    await expect(list.root).toBeVisible();

    await page.getByTestId('interventions-new').click();
    await expect(list.createSheet).toBeVisible();

    const name = page.getByTestId('intervention-create-name');
    await name.click();
    await name.pressSequentially('Roof round — north wing');

    await expectSheetGuardHolds(page, list.createSheet, () => page.keyboard.press('Escape'));
  });

  test('the work item sheet keeps a started draft that Cancel would discard', async ({ page }) => {
    const api = new ApiMock(page);
    await mockDetailPage(api, 'in_progress');

    const detail = new InterventionDetailPage(page);
    await detail.goto(E2E_ORGANIZATION_ID, interventionId);
    await expect(detail.root).toBeVisible();

    await page.getByTestId('intervention-work-items-empty-add').click();
    const sheet = page.getByTestId('intervention-work-item-sheet');
    await expect(sheet).toBeVisible();

    await page.locator('#intervention-work-item-action').click();
    await page.getByRole('option').first().click();

    await expectSheetGuardHolds(page, sheet, () =>
      sheet.getByTestId('intervention-work-item-cancel').click(),
    );
  });

  test('the request changes sheet keeps a typed note that Escape would discard', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await mockDetailPage(api, 'submitted');

    const detail = new InterventionDetailPage(page);
    await detail.goto(E2E_ORGANIZATION_ID, interventionId);
    await expect(detail.root).toBeVisible();

    await page.getByTestId('intervention-command-secondary').click();
    const sheet = page.getByTestId('intervention-request-changes-sheet');
    await expect(sheet).toBeVisible();

    const note = sheet.getByTestId('intervention-request-changes-note');
    await note.click();
    await note.pressSequentially('Re-check the third floor.');

    await expectSheetGuardHolds(page, sheet, () => page.keyboard.press('Escape'));
  });
});
