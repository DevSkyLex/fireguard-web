import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { expectNoHorizontalOverflow } from '../support/helpers/appearance';
import {
  captureInteractionMode,
  mockInteractionModeInterventions,
} from '../support/helpers/interaction-mode';
import { InterventionsPage } from '../support/pages/interventions.page';

test('keeps desktop controls and navigation at a 375 pixel viewport', async ({ page }, info) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockInteractionModeInterventions(page);
  const list = new InterventionsPage(page);
  await list.goto(E2E_ORGANIZATION_ID);

  await expect(page.locator('html')).toHaveAttribute('data-interaction-mode', 'desktop');
  await expect(page.getByTestId('intervention-table')).toBeVisible();
  await expect(page.getByTestId('intervention-table-cards')).toBeHidden();
  await expect(page.locator('#organization-mobile-navigation')).toHaveCount(0);
  const sidebar = page.getByTestId('dashboard-sidebar-trigger');
  await expect(sidebar).toBeVisible();
  expect((await sidebar.boundingBox())?.height).toBeLessThan(44);

  await list.openFilters();
  await list.addFilterTrigger.focus();
  await list.addFilterTrigger.press('Enter');
  const status = page.getByRole('menuitem', { name: 'Status', exact: true });
  await expect(status).toBeVisible();
  expect((await status.boundingBox())?.height).toBeLessThan(44);
  await expect(page.getByTestId('interventions-filters-add-drawer')).toHaveCount(0);
  await captureInteractionMode(page, info, 'desktop-375-filter-menu');
  await page.keyboard.press('Escape');
  await expect(list.addFilterTrigger).toBeFocused();

  await page.locator('#theme-switcher-trigger').click();
  await expect(page.getByRole('menuitem')).toHaveText(['Light', 'Dark', 'System']);
  await expect(page.getByText('Interface layout', { exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');

  await sidebar.focus();
  await sidebar.press('Enter');
  await expect(
    page.getByRole('dialog').getByRole('link', { name: 'Interventions', exact: true }),
  ).toBeVisible();
  await captureInteractionMode(page, info, 'desktop-375-sidebar');
  await page.keyboard.press('Escape');
  await expect(sidebar).toBeFocused();
  await expectNoHorizontalOverflow(page);
});
