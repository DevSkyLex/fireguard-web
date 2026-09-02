import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { interventionOutput } from '../support/fixtures/intervention-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { InterventionsPage } from '../support/pages/interventions.page';

const FIXTURES = [
  interventionOutput({
    id: 'e2e-tab-1',
    '@id': '/api/interventions/e2e-tab-1',
    number: 301,
    name: 'Riser check',
    status: 'planned',
  }),
];

test.describe('Interventions tabs — header survives a tab switch', () => {
  test('keeps the tab list and the New button reachable through a full round trip of clicks', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockInterventionList(E2E_ORGANIZATION_ID, FIXTURES);
    await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
    await api.mockInterventionTemplates(E2E_ORGANIZATION_ID, []);
    await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
    await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);

    const interventions = new InterventionsPage(page);
    await interventions.goto(E2E_ORGANIZATION_ID);

    const tabList = page.getByTestId('intervention-view-toggle');
    const newButton = page.getByTestId('interventions-new');
    const listTab = page.getByTestId('intervention-view-toggle-list');
    const boardTab = page.getByTestId('intervention-view-toggle-board');
    const calendarTab = page.getByTestId('intervention-view-toggle-calendar');

    await expect(tabList).toBeVisible();
    await expect(newButton).toBeVisible();
    await expect(listTab).toHaveAttribute('aria-pressed', 'true');

    await boardTab.click();
    await expect(page).toHaveURL(/view=board/);
    await expect(tabList).toBeVisible();
    await expect(newButton).toBeVisible();
    await expect(boardTab).toHaveAttribute('aria-pressed', 'true');

    await listTab.click();
    await expect(page).not.toHaveURL(/view=/);
    await expect(tabList).toBeVisible();
    await expect(newButton).toBeVisible();
    await expect(listTab).toHaveAttribute('aria-pressed', 'true');

    await calendarTab.click();
    await expect(page).toHaveURL(/view=calendar/);
    await expect(tabList).toBeVisible();
    await expect(newButton).toBeVisible();
    await expect(calendarTab).toHaveAttribute('aria-pressed', 'true');

    await listTab.click();
    await expect(page).not.toHaveURL(/view=/);
    await expect(tabList).toBeVisible();
    await expect(newButton).toBeVisible();
    await expect(listTab).toHaveAttribute('aria-pressed', 'true');
  });
});
