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

/** Registers the session and every collection the "Recurrences" sheet reads: the list itself plus the templates/sites/members it feeds into the embedded form. */
async function mockRecurrencesSheet(
  api: ApiMock,
  recurrences: readonly InterventionRecurrenceOutputFixture[] = [interventionRecurrenceOutput()],
): Promise<void> {
  await api.mockAuthenticatedSession();
  await api.mockInterventionList(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionTemplates(E2E_ORGANIZATION_ID, [template]);
  await api.mockInterventionRecurrenceList(E2E_ORGANIZATION_ID, recurrences);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
}

test.describe('Interventions — Recurrences sheet', () => {
  test('shows localized cadence labels in the table and the frequency select, never the raw literal', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await mockRecurrencesSheet(api, [
      interventionRecurrenceOutput({
        name: 'Quarterly fire door check',
        frequency: 'quarterly',
        interval: 2,
      }),
    ]);
    const interventions = new InterventionsPage(page);

    await interventions.goto(E2E_ORGANIZATION_ID);
    await interventions.openRecurrences();

    await expect(interventions.recurrencesSheet).toBeVisible();
    await expect(interventions.recurrencesSheet).toContainText('2× Quarterly');
    await expect(interventions.recurrencesSheet).not.toContainText('quarterly');

    await page.getByTestId('intervention-recurrences-new').click();
    await expect(page.getByTestId('intervention-recurrence-frequency')).toContainText('Monthly');

    await page.getByTestId('intervention-recurrence-frequency').click();
    await expect(page.getByRole('option', { name: 'Weekly' })).toBeVisible();
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
    const interventions = new InterventionsPage(page);

    await interventions.goto(E2E_ORGANIZATION_ID);
    await interventions.openRecurrences();

    await expect(interventions.recurrencesSheet).toBeVisible();

    const alert = page.getByTestId('intervention-recurrences-error');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Recurrences could not be loaded');
    await expect(page.getByTestId('intervention-recurrences-empty')).toHaveCount(0);
    await expect(page.getByTestId('intervention-recurrences-table')).toHaveCount(0);
  });

  test('scrolls the table body and the sheet content instead of overflowing past their bounds', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    const many = Array.from({ length: 20 }, (_unused, index) =>
      interventionRecurrenceOutput({
        id: `e2e-recurrence-${index}`,
        '@id': `/api/intervention-recurrences/e2e-recurrence-${index}`,
        name: `Recurrence ${index}`,
      }),
    );
    await mockRecurrencesSheet(api, many);
    const interventions = new InterventionsPage(page);

    await interventions.goto(E2E_ORGANIZATION_ID);
    await interventions.openRecurrences();

    await expect(interventions.recurrencesSheet).toBeVisible();

    const sheetOverflowY = await interventions.recurrencesSheet.evaluate(
      (element) => getComputedStyle(element).overflowY,
    );
    expect(sheetOverflowY).toBe('auto');

    const tableContainer = interventions.recurrencesSheet.locator('[hlmTableContainer]');
    const tableScrolls = await tableContainer.evaluate(
      (element) =>
        getComputedStyle(element).overflowY === 'auto' &&
        element.scrollHeight > element.clientHeight,
    );
    expect(tableScrolls).toBe(true);
  });
});
