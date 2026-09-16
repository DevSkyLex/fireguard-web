import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { arrangeInterventionTables } from '../support/helpers/intervention-detail-tables';

for (const dark of [false, true]) {
  test(`uses cards on a touch phone ${dark ? 'dark' : 'light'}`, async ({
    page,
    context,
    baseURL,
  }, info) => {
    await emulateMobilePlatform(context, info.project.name.includes('Safari') ? 'ios' : 'android');
    if (!baseURL) throw new Error('Expected the configured E2E base URL');
    if (dark) await setDarkTheme(context, baseURL);
    const path = await arrangeInterventionTables(page);
    await page.goto(`${path}?tab=changes`);
    await expect(page.getByTestId('intervention-change-card')).toBeVisible();
    await expect(page.getByTestId('intervention-changes-table')).not.toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: info.outputPath('changes-touch.png'), animations: 'disabled' });
    await page.getByRole('tab', { name: /^Changes/ }).focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('intervention-equipment-table-card')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expect(page).toHaveTitle(/Table regression intervention/);
  });
}
