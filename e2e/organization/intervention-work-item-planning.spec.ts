import { expect, test } from '@playwright/test';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  expectNoInternalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { arrangeWorkItemPlanning } from '../support/helpers/work-item-planning';

for (const theme of ['light', 'dark'] as const) {
  test(`enters effort and a bounded work period with the desktop keyboard in ${theme} mode`, async ({
    page,
    context,
    baseURL,
  }) => {
    await page.setViewportSize({ width: 1670, height: 938 });
    if (theme === 'dark') await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    const errors = collectConsoleErrors(page);
    const { writes, date } = await arrangeWorkItemPlanning(page);
    const sheet = page.getByTestId('intervention-work-item-sheet');
    const trigger = page.locator('#work-item-period');
    const minutes = page.getByLabel('Minutes', { exact: true });
    await page.getByLabel('Hours', { exact: true }).fill('2');
    await minutes.fill('75');
    await minutes.press('Tab');
    await expect(sheet).toContainText('Enter whole minutes between 0 and 59.');
    await minutes.fill('30');
    await trigger.focus();
    await trigger.press('Enter');
    const grid = page.getByRole('grid');
    await expect(grid).toBeVisible();
    await grid.getByRole('gridcell', { name: '14', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(grid).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(trigger).toContainText('Choose specific dates');
    await trigger.press('Enter');
    await grid.getByRole('gridcell', { name: '14', exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight');
    await expect(grid.getByRole('gridcell', { name: '15', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(grid).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(sheet).toHaveAttribute('data-dirty', 'true');
    await expectNoHorizontalOverflow(page);
    await expectNoInternalOverflow(sheet);
    await page.screenshot({
      path: `e2e/artifacts/work-item-planning/${theme}/desktop-form.png`,
      animations: 'disabled',
    });
    await trigger.click();
    await expect(grid).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Go to the next month', exact: true }),
    ).toBeDisabled();
    await page.screenshot({
      path: `e2e/artifacts/work-item-planning/${theme}/desktop-calendar.png`,
      animations: 'disabled',
    });
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await sheet.getByRole('button', { name: 'Use intervention dates', exact: true }).click();
    await expect(trigger).toBeFocused();
    await expect(
      sheet.getByRole('button', { name: 'Use intervention dates', exact: true }),
    ).toHaveCount(0);
    await trigger.click();
    await grid.getByRole('gridcell', { name: '14', exact: true }).click();
    await grid.getByRole('gridcell', { name: '15', exact: true }).click();
    await sheet.getByTestId('intervention-work-item-submit').click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0]).toMatchObject({
      estimatedMinutes: 150,
      workStartsOn: date(14),
      workEndsOn: date(15),
    });
    await expect(sheet).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
