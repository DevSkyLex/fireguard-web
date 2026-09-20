import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { collectConsoleErrors } from '../support/helpers/appearance';
import {
  expectResourceIllustration,
  mockEmptyResources,
} from '../support/helpers/resource-empty-states';
import { EquipmentsPage } from '../support/pages/equipments.page';

test.describe('Illustrated resource empty states', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`renders a compact ${theme} equipment empty state and keeps the create action`, async ({
      page,
      context,
      baseURL,
    }) => {
      await context.addCookies([
        { name: 'theme-preference', value: theme, url: baseURL ?? 'http://localhost:4273' },
      ]);
      await page.setViewportSize({ width: 1440, height: 1000 });
      const errors = collectConsoleErrors(page);
      await mockEmptyResources(page);
      const equipment = new EquipmentsPage(page);
      await equipment.gotoList(E2E_ORGANIZATION_ID);
      await expectResourceIllustration(page, 'equipment', theme);
      await expect(equipment.newLink).toBeVisible();
      await page.screenshot({
        path: `e2e/artifacts/resource-empty-states/equipment-desktop-${theme}.png`,
        animations: 'disabled',
      });
      expect(errors).toEqual([]);
    });
  }

  for (const entry of [
    { route: 'facilities', resource: 'site' },
    { route: 'inspections', resource: 'inspection' },
    { route: 'checklists', resource: 'checklist' },
    { route: 'maintenance', resource: 'maintenance' },
    { route: 'interventions?view=list', resource: 'intervention' },
    { route: 'members', resource: 'member' },
    { route: 'members', resource: 'team' },
  ]) {
    test(`uses the ${entry.resource} artwork for its empty resource collection`, async ({
      page,
      context,
      baseURL,
    }) => {
      await context.addCookies([
        { name: 'theme-preference', value: 'dark', url: baseURL ?? 'http://localhost:4273' },
      ]);
      await page.setViewportSize({ width: 1440, height: 1000 });
      const errors = collectConsoleErrors(page);
      await mockEmptyResources(page);
      await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/${entry.route}`);
      if (entry.resource === 'team')
        await page.getByTestId('organization-members-tab-teams').click();
      await expectResourceIllustration(page, entry.resource, 'dark');
      await page.screenshot({
        path: `e2e/artifacts/resource-empty-states/${entry.resource}-desktop-dark.png`,
        animations: 'disabled',
      });
      expect(errors).toEqual([]);
    });
  }

  test('updates the existing image when the app theme changes', async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([
      { name: 'theme-preference', value: 'light', url: baseURL ?? 'http://localhost:4273' },
    ]);
    await mockEmptyResources(page);
    await new EquipmentsPage(page).gotoList(E2E_ORGANIZATION_ID);
    await expectResourceIllustration(page, 'equipment', 'light');
    await page.locator('#theme-switcher-trigger').click();
    await page.getByRole('menuitem', { name: 'Dark', exact: true }).click();
    await expectResourceIllustration(page, 'equipment', 'dark');
  });

  test('keeps search and filter misses unillustrated without adding a forbidden create action', async ({
    page,
  }) => {
    const api = await mockEmptyResources(page);
    await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
      permissions: ['organization.equipment.read'],
    });
    const equipment = new EquipmentsPage(page);
    await equipment.gotoList(E2E_ORGANIZATION_ID);
    await expectResourceIllustration(page, 'equipment', 'light');
    await expect(equipment.newLink).toHaveCount(0);
    await equipment.search.fill('no-such-extinguisher');
    await expect(page.getByTestId('resource-illustration')).toHaveCount(0);
    await expect(page.getByText('No equipment found', { exact: true })).toBeVisible();
    await equipment.search.clear();
    await expectResourceIllustration(page, 'equipment', 'light');
    await equipment.openFilters();
    await equipment.addFilter('Status');
    await page.getByRole('option', { name: 'Operational', exact: true }).click();
    await expect(page.getByTestId('resource-illustration')).toHaveCount(0);
    await expect(equipment.newLink).toHaveCount(0);
  });
});
