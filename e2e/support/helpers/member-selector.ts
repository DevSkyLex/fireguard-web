import { join } from 'node:path';
import { expect, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow } from './appearance';

/** Checks organization identity in native filter and form selections, including clearing. */
export async function checkWorkloadMemberSelectors(
  page: Page,
  directory: string,
  touch = false,
): Promise<void> {
  const role = 'Responsable de la maintenance et de la sécurité incendie';
  const filters = page.getByTestId('workload-filters-toggle');
  if ((await filters.getAttribute('aria-expanded')) !== 'true') {
    if (touch) await filters.tap();
    else await filters.click();
  }
  await page.getByTestId('workload-filters-add').click();
  await page
    .getByTestId('workload-filters-add-option')
    .filter({ hasText: /^Member$/ })
    .click();
  const option = page.getByRole('option').filter({ hasText: 'Alexandrie Fernández' });
  await expect(option.getByText(role, { exact: true })).toBeVisible();
  await expect(option.locator('hlm-avatar')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: join(directory, 'member-filter-options.png'),
    animations: 'disabled',
  });
  if (touch) {
    await option.tap();
  } else {
    await option.click();
  }
  const selected = page.getByTestId('workload-filter-member');
  await expect(selected).toContainText(role);
  await expect(selected.locator('hlm-avatar')).toBeVisible();
  await expect(selected.locator('hlm-avatar')).toHaveCSS('height', '16px');
  await page.screenshot({
    path: join(directory, 'member-filter-selected.png'),
    animations: 'disabled',
  });
  await expect(option).toHaveCount(0);
  await page.getByRole('button', { name: 'Configure capacity', exact: true }).click();
  const scope = page.locator('hlm-combobox-input').filter({ has: page.locator('#capacity-scope') });
  if (touch) await scope.getByRole('combobox').tap();
  else await scope.getByRole('combobox').fill('Alexandrie');
  await expect(option).toHaveCount(1);
  await expect(option.getByText(role, { exact: true })).toBeVisible();
  if (touch) await option.tap();
  else {
    await scope.getByRole('combobox').press('ArrowDown');
    await scope.getByRole('combobox').press('Enter');
  }
  await expect(scope.getByRole('combobox')).toHaveValue(/Alexandrie Fernández/);
  await expect(scope).toContainText(role);
  await expect(scope.locator('hlm-avatar')).toBeVisible();
  await page.getByLabel('Effective from', { exact: true }).focus();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: join(directory, 'member-capacity-selected.png'),
    animations: 'disabled',
  });
  await scope.getByRole('button', { name: 'Clear selection', exact: true }).click();
  await expect(scope.getByRole('combobox')).toHaveValue('');
  await expect(scope.locator('hlm-avatar')).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByTestId('workload-clear-filters').click();
}
