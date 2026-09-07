import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { interventionOutput } from '../support/fixtures/intervention-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { InterventionsCalendarPage } from '../support/pages/interventions-calendar.page';

/** An ISO instant at local noon today (`e2e/README.md`'s date-fixture convention). */
function isoInstantToday(): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

const todayIso: string = isoInstantToday();
const todayDay: string = todayIso.slice(0, 10);

const plannedToday = interventionOutput({
  id: 'e2e-calendar-planned',
  '@id': '/api/interventions/e2e-calendar-planned',
  number: 501,
  name: 'Calendar planned intervention',
  status: 'planned',
  plannedStartAt: todayIso,
});

test.describe('Interventions calendar — month view over the shared dataset', () => {
  test("places a seeded intervention in today's cell, listing it in the day panel with its FG-number and status", async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockInterventionList(E2E_ORGANIZATION_ID, [plannedToday]);

    const calendar = new InterventionsCalendarPage(page);
    await calendar.goto(E2E_ORGANIZATION_ID);

    await expect(calendar.root).toBeVisible();
    await calendar.selectDay(todayDay);

    const entry = calendar.entry('Calendar planned intervention');
    await expect(entry).toBeVisible();
    await expect(entry).toContainText('FG-501');
    await expect(entry).toContainText('Planned');
  });

  test('round-trips the three-way List/Board/Calendar toggle', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockInterventionList(E2E_ORGANIZATION_ID, [plannedToday]);

    const calendar = new InterventionsCalendarPage(page);
    await calendar.goto(E2E_ORGANIZATION_ID);

    await expect(calendar.root).toBeVisible();
    await expect(page.getByTestId('intervention-view-toggle-calendar').first()).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await page.getByTestId('intervention-view-toggle-board').first().click();
    await expect(page).toHaveURL(
      new RegExp(`/organizations/${E2E_ORGANIZATION_ID}/interventions\\?.*view=board`),
    );
    await expect(page.locator('#interventions-board')).toBeVisible();

    await page.getByTestId('intervention-view-toggle-calendar').first().click();
    await expect(page).toHaveURL(
      new RegExp(`/organizations/${E2E_ORGANIZATION_ID}/interventions\\?.*view=calendar`),
    );
    await expect(calendar.root).toBeVisible();

    await page.getByTestId('intervention-view-toggle-list').first().click();
    await expect(page).toHaveURL(
      new RegExp(`/organizations/${E2E_ORGANIZATION_ID}/interventions(\\?(?!.*view=).*)?$`),
    );
    await expect(page.locator('#interventions')).toBeVisible();
  });
});
