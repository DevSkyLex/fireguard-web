import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { interventionStatisticsOutput } from '../support/fixtures/intervention-fixtures';
import { expectNoHorizontalOverflow } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';

test('collapses intermediate breadcrumb levels into a menu on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionStatistics(interventionStatisticsOutput());
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionTemplates(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionList(E2E_ORGANIZATION_ID, []);

  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/interventions`);

  const more = page.getByTestId('dashboard-breadcrumb-more');
  await expect(more).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Interventions', exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await more.focus();
  await page.keyboard.press('Enter');
  const organizationLink = page
    .locator('[data-slot="dropdown-menu"]')
    .getByText('E2E Organization', { exact: true });
  await expect(organizationLink).toBeVisible();
  await page.screenshot({
    path: 'e2e/artifacts/dashboard-breadcrumb-375.png',
    animations: 'disabled',
  });

  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(more).toBeHidden();
  await expect(page.getByRole('link', { name: 'E2E Organization', exact: true })).toBeVisible();
});
