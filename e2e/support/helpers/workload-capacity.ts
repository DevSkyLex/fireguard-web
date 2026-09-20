import { join } from 'node:path';
import { expect, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, expectNoInternalOverflow } from './appearance';

/**
 * Function checkCapacityEditorPresentation
 *
 * @description
 * Exercises the native picker, local day validation and readable history in an already open sheet.
 * Restores the initial draft before returning to the caller's save workflow.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {Page} page - Hermetic browser page.
 * @param {string} directory - Durable capture directory.
 * @param {boolean} touch - Whether to operate the picker by touch.
 * @returns {Promise<void>}
 */
export async function checkCapacityEditorPresentation(
  page: Page,
  directory: string,
  touch = false,
): Promise<void> {
  const trigger = page.getByRole('button', { name: 'Effective from', exact: true });
  if (touch) await trigger.tap();
  else {
    await trigger.focus();
    await trigger.press('Enter');
  }
  const grid = page.getByRole('grid');
  await expect(grid).toBeVisible();
  if (touch) {
    await expect(page.locator('hlm-drawer-content')).toBeVisible();
    const dateBounds = await grid.getByRole('gridcell', { name: '17', exact: true }).boundingBox();
    if (!dateBounds) throw new Error('The calendar day must be visible.');
    expect(dateBounds.width).toBeGreaterThanOrEqual(44);
    expect(dateBounds.height).toBeGreaterThanOrEqual(44);
  } else {
    await expect(page.getByRole('button', { name: 'Go to the previous month' })).toBeFocused();
  }
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: join(directory, 'capacity-datepicker.png'),
    animations: 'disabled',
  });
  if (touch) await grid.getByRole('gridcell', { name: '17', exact: true }).tap();
  else {
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Go to the next month' })).toBeFocused();
    await page.keyboard.press('Tab');
    const selectedDay = grid.getByRole('gridcell', { name: '16', exact: true });
    await expect(selectedDay).toBeFocused();
    await selectedDay.press('ArrowRight');
    const nextDay = grid.getByRole('gridcell', { name: '17', exact: true });
    await expect(nextDay).toBeFocused();
    await nextDay.press('Enter');
  }
  await expect(grid).toHaveCount(0);
  await expect(trigger).toContainText('Sep 17, 2026');
  if (!touch) {
    await expect(trigger).toBeFocused();
    await trigger.press('Enter');
    await expect(grid).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(grid).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
  await trigger.click();
  await grid.getByRole('gridcell', { name: '16', exact: true }).click();
  await expect(grid).toHaveCount(0);
  await expect(trigger).toContainText('Sep 16, 2026');
  const monday = page.getByRole('textbox', { name: 'Monday Hours', exact: true });
  const tuesday = page.getByRole('textbox', { name: 'Tuesday Hours', exact: true });
  const wednesday = page.getByRole('textbox', { name: 'Wednesday Hours', exact: true });
  const tuesdayBefore = await tuesday.boundingBox();
  const wednesdayBefore = await wednesday.boundingBox();
  if (!tuesdayBefore || !wednesdayBefore) throw new Error('Weekday controls must be visible.');
  const before = wednesdayBefore.y - tuesdayBefore.y;
  await monday.fill('25');
  await tuesday.focus();
  const error = page.locator('#capacity-day-0-error');
  await expect(error).toHaveText('Enter whole hours between 0 and 24.');
  const labelBounds = await page.locator('#capacity-day-0-label').boundingBox();
  const errorBounds = await error.boundingBox();
  const tuesdayAfter = await tuesday.boundingBox();
  const wednesdayAfter = await wednesday.boundingBox();
  if (!labelBounds || !errorBounds || !tuesdayAfter || !wednesdayAfter)
    throw new Error('Weekday controls, label and its error must be visible.');
  expect(errorBounds.x).toBe(labelBounds.x);
  expect(errorBounds.y - labelBounds.y - labelBounds.height).toBeLessThanOrEqual(4);
  expect(wednesdayAfter.y - tuesdayAfter.y).toBe(before);
  await expect(page.locator('hlm-field-error')).toHaveCount(1);
  await page.screenshot({
    path: join(directory, 'capacity-label-error.png'),
    animations: 'disabled',
  });
  await monday.fill('7');
  await tuesday.focus();
  await expect(error).toHaveCount(0);
  const history = page.getByRole('button', { name: 'Capacity history', exact: true });
  await history.click();
  const week = page.getByTestId('workload-capacity-history-week').first();
  await expect(week).toBeVisible();
  await expect(week.locator('dt')).toHaveText(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  await expect(week.locator('dd')).toHaveText([
    '7 h',
    '7 h',
    '7 h',
    '7 h',
    '7 h',
    '0 min',
    '0 min',
  ]);
  await week.scrollIntoViewIfNeeded();
  await expectNoInternalOverflow(week);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: join(directory, 'capacity-history.png'), animations: 'disabled' });
  await history.click();
}
