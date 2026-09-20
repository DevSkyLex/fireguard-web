import { expect, test } from '@playwright/test';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  expectNoInternalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { arrangeWorkItemPlanning } from '../support/helpers/work-item-planning';

for (const theme of ['light', 'dark'] as const) {
  test(`stages a touch-sized work period without losing the form in ${theme} mode`, async ({
    page,
    context,
    baseURL,
  }, info) => {
    await emulateMobilePlatform(context, info.project.name === 'Mobile Safari' ? 'ios' : 'android');
    if (theme === 'dark') await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    const errors = collectConsoleErrors(page);
    const { writes, date } = await arrangeWorkItemPlanning(page);
    const sheet = page.getByTestId('intervention-work-item-sheet');
    const trigger = page.locator('#work-item-period');
    await page.getByLabel('Hours', { exact: true }).fill('1');
    await page.getByLabel('Minutes', { exact: true }).fill('45');
    await trigger.tap();
    const drawer = page.locator('hlm-drawer-content');
    const grid = drawer.getByRole('grid');
    await expect(drawer).toBeVisible();
    await grid.getByRole('gridcell', { name: '14', exact: true }).tap();
    await expect(drawer.getByRole('button', { name: 'Apply', exact: true })).toBeDisabled();
    await drawer.getByRole('button', { name: 'Cancel', exact: true }).tap();
    await expect(drawer).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveText('Choose specific dates');
    await trigger.tap();
    const start = grid.getByRole('gridcell', { name: '14', exact: true });
    await start.tap();
    await grid.getByRole('gridcell', { name: '16', exact: true }).tap();
    const box = await start.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
    await expectNoHorizontalOverflow(page);
    await expectNoInternalOverflow(drawer);
    await page.screenshot({
      path: `e2e/artifacts/work-item-planning/${theme}/${info.project.name}-calendar.png`,
      animations: 'disabled',
    });
    await drawer.getByRole('button', { name: 'Cancel', exact: true }).focus();
    await page.keyboard.press('Shift+Tab');
    await expect
      .poll(() => drawer.evaluate((element) => element.contains(document.activeElement)))
      .toBe(true);
    await drawer.getByRole('button', { name: 'Apply', exact: true }).tap();
    await expect(drawer).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(sheet).toHaveAttribute('data-dirty', 'true');
    await expect(page.getByLabel('Hours', { exact: true })).toHaveValue('1');
    await expectNoInternalOverflow(sheet);
    await page.screenshot({
      path: `e2e/artifacts/work-item-planning/${theme}/${info.project.name}-form.png`,
      animations: 'disabled',
    });
    await sheet.getByTestId('intervention-work-item-submit').tap();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0]).toMatchObject({
      estimatedMinutes: 105,
      workStartsOn: date(14),
      workEndsOn: date(16),
    });
    await expect(sheet).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
