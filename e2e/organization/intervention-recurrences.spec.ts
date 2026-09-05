import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  interventionRecurrenceOutput,
  interventionTemplateOutput,
  type InterventionRecurrenceOutputFixture,
} from '../support/fixtures/intervention-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { InterventionsPage } from '../support/pages/interventions.page';

const template = interventionTemplateOutput();

/** Registers the session and every collection the "Recurrences" tab reads: the list itself plus the templates/sites/members it feeds into the form sheet. */
async function mockRecurrencesTab(
  api: ApiMock,
  recurrences: readonly InterventionRecurrenceOutputFixture[] = [interventionRecurrenceOutput()],
): Promise<void> {
  await api.mockAuthenticatedSession();
  await api.mockInterventionList(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionTemplates(E2E_ORGANIZATION_ID, [template]);
  await api.mockInterventionRecurrenceList(E2E_ORGANIZATION_ID, recurrences);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
}

test.describe('Interventions — Recurrences tab', () => {
  test('shows localized cadence labels in the table and the frequency select, never the raw literal', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await mockRecurrencesTab(api, [
      interventionRecurrenceOutput({
        name: 'Quarterly fire door check',
        frequency: 'quarterly',
        interval: 2,
      }),
    ]);
    const interventions = new InterventionsPage(page);

    await interventions.goto(E2E_ORGANIZATION_ID);
    await interventions.openRecurrences();

    await expect(interventions.recurrencesTable).toBeVisible();
    await expect(interventions.recurrencesTable).toContainText('2× Quarterly');
    await expect(interventions.recurrencesTable).not.toContainText('quarterly');

    await interventions.createMenu.click();
    await interventions.recurrencesNew.click();
    await expect(interventions.recurrenceSheet).toBeVisible();
    await expect(page.getByTestId('intervention-recurrence-frequency')).toContainText('Monthly');

    await expect(async () => {
      await page.getByTestId('intervention-recurrence-frequency').click();
      await expect(page.getByRole('option', { name: 'Weekly' })).toBeVisible({ timeout: 1000 });
    }).toPass();
    await expect(page.getByRole('option', { name: 'Every 6 months' })).toBeVisible();
  });

  test('shows an alert instead of the grid when the recurrence list fails to load', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockInterventionList(E2E_ORGANIZATION_ID, []);
    await api.mockInterventionTemplates(E2E_ORGANIZATION_ID, [template]);
    await api.mockInterventionRecurrenceListError({ detail: 'Recurrences could not be loaded.' });
    await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
    await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
    await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
    const interventions = new InterventionsPage(page);

    await interventions.goto(E2E_ORGANIZATION_ID);
    await interventions.openRecurrences();

    const alert = page.getByTestId('intervention-recurrences-error');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Recurrences could not be loaded');
    await expect(page.getByTestId('intervention-recurrences-empty')).toHaveCount(0);
    await expect(page.getByTestId('intervention-recurrences-table')).toHaveCount(0);
  });

  test('scrolls the table body instead of overflowing the tab past its bounds', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    const lastRowId = 'e2e-recurrence-19';
    const many = Array.from({ length: 20 }, (_unused, index) =>
      interventionRecurrenceOutput({
        id: `e2e-recurrence-${index}`,
        '@id': `/api/intervention-recurrences/e2e-recurrence-${index}`,
        name: `Recurrence ${index}`,
      }),
    );
    await mockRecurrencesTab(api, many);
    const interventions = new InterventionsPage(page);

    await interventions.goto(E2E_ORGANIZATION_ID);
    await interventions.openRecurrences();

    await expect(interventions.recurrencesTable).toBeVisible();
    await expect(page.getByTestId(`intervention-recurrence-row-${lastRowId}`)).toBeVisible();

    const tableContainer = interventions.recurrencesTable.locator('xpath=..');
    const tableScrolls = await tableContainer.evaluate(
      (element) =>
        getComputedStyle(element).overflowY === 'auto' &&
        element.scrollHeight > element.clientHeight,
    );
    expect(tableScrolls).toBe(true);
  });

  test('opens the create form sheet from "New recurrence" while the table stays visible', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await mockRecurrencesTab(api);
    const interventions = new InterventionsPage(page);

    await interventions.goto(E2E_ORGANIZATION_ID);
    await interventions.openRecurrenceCreate();

    await expect(interventions.recurrenceSheet).toBeVisible();
    await expect(interventions.recurrenceSheet).toContainText('New recurrence');
    await expect(interventions.recurrencesTable).toBeVisible();
  });

  test('seeds the form sheet with the row when Edit is clicked', async ({ page }) => {
    const api = new ApiMock(page);
    const recurrence = interventionRecurrenceOutput({ name: 'Quarterly fire door check' });
    await mockRecurrencesTab(api, [recurrence]);
    const interventions = new InterventionsPage(page);

    await interventions.goto(E2E_ORGANIZATION_ID);
    await interventions.openRecurrences();

    await page.getByTestId(`intervention-recurrence-menu-${recurrence.id}`).click();
    await page.getByTestId(`intervention-recurrence-edit-${recurrence.id}`).click();

    await expect(interventions.recurrenceSheet).toBeVisible();
    await expect(interventions.recurrenceSheet).toContainText('Edit recurrence');
    await expect(page.getByTestId('intervention-recurrence-name')).toHaveValue(recurrence.name);
  });

  test('deletes the recurrence through the confirm dialog', async ({ page }) => {
    const api = new ApiMock(page);
    const recurrence = interventionRecurrenceOutput({ name: 'Quarterly fire door check' });
    await mockRecurrencesTab(api, [recurrence]);
    await api.mockInterventionRecurrenceDelete(recurrence.id);
    const interventions = new InterventionsPage(page);

    await interventions.goto(E2E_ORGANIZATION_ID);
    await interventions.openRecurrences();

    await page.getByTestId(`intervention-recurrence-menu-${recurrence.id}`).click();
    await page.getByTestId(`intervention-recurrence-remove-${recurrence.id}`).click();

    const dialog = page.getByTestId('intervention-recurrence-delete-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(recurrence.name);

    await page.getByTestId('intervention-recurrence-delete-dialog-confirm').click();

    await expect(dialog).toBeHidden();
    await expect(page.getByTestId(`intervention-recurrence-row-${recurrence.id}`)).toHaveCount(0);
  });

  test('opens the unsaved-changes dialog when Escape is pressed on a dirty sheet', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await mockRecurrencesTab(api);
    const interventions = new InterventionsPage(page);

    await interventions.goto(E2E_ORGANIZATION_ID);
    await interventions.openRecurrenceCreate();
    await expect(interventions.recurrenceSheet).toBeVisible();

    await page.getByTestId('intervention-recurrence-name').fill('Draft recurrence');

    const unsavedDialog = page.getByTestId('unsaved-changes-dialog');
    await expect(async () => {
      if (!(await interventions.recurrenceSheet.isVisible())) {
        await interventions.openRecurrenceCreate();
        await expect(interventions.recurrenceSheet).toBeVisible();
        await page.getByTestId('intervention-recurrence-name').fill('Draft recurrence');
      }
      await page.keyboard.press('Escape');
      await expect(unsavedDialog).toBeVisible({ timeout: 1000 });
    }).toPass();

    await unsavedDialog.getByTestId('unsaved-changes-discard').click();
    await expect(interventions.recurrenceSheet).toBeHidden();
  });
});
