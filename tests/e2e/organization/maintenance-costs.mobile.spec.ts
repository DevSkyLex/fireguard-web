import { expect, test } from '@playwright/test';
import { expectMinimumCssPixels, setDarkTheme } from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import {
  captureMaintenanceCosts,
  installMaintenanceCosts,
  MAINTENANCE_COST_URL,
} from '../support/helpers/maintenance-costs';

for (const dark of [false, true])
  test(`keeps exact private costs and expense recovery reachable by touch in ${dark ? 'dark' : 'light'} mode`, async ({
    page,
    context,
    baseURL,
  }, info) => {
    await emulateMobilePlatform(context, info.project.name.includes('Safari') ? 'ios' : 'android');
    if (dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    const state = await installMaintenanceCosts(page, { closed: true, loseExpenseReply: true });
    await page.goto(MAINTENANCE_COST_URL);
    const tablist = page.getByRole('tablist');
    await expect(tablist).toBeVisible();
    const [listBounds, tabsBounds] = await Promise.all([
      tablist.boundingBox(),
      Promise.all((await tablist.getByRole('tab').all()).map((tab) => tab.boundingBox())),
    ]);
    for (const tabBounds of tabsBounds) {
      if (!listBounds || !tabBounds) throw new Error('Financial tabs need visible bounds');
      expectMinimumCssPixels(tabBounds.height, 44);
      expect(tabBounds.y).toBeGreaterThanOrEqual(listBounds.y - 1);
      expect(tabBounds.y + tabBounds.height).toBeLessThanOrEqual(
        listBounds.y + listBounds.height + 1,
      );
    }
    const cards = page.getByTestId('maintenance-cost-cards').first();
    await expect(cards).toBeVisible();
    await expect(cards).toContainText('External repair of the entrance');
    await expect(cards).toContainText('Unknown');
    await captureMaintenanceCosts(page, info, `mobile-contributions-${dark ? 'dark' : 'light'}`);
    const expense = page.getByTestId('maintenance-expense-form');
    await expense.getByLabel('Exact amount', { exact: true }).fill('2.123456');
    await expense.getByLabel('Actual date and time', { exact: true }).fill('2025-01-15T14:30');
    await expense
      .getByLabel('Description or correction reason', { exact: true })
      .fill('Touch repair fee');
    await expense.getByRole('button', { name: 'Record expense', exact: true }).tap();
    const retry = page.getByRole('button', { name: 'Retry the original declaration', exact: true });
    await expect(retry).toBeVisible();
    await retry.scrollIntoViewIfNeeded();
    const bounds = await retry.boundingBox();
    if (!bounds) throw new Error('Recovery action needs visible bounds');
    expectMinimumCssPixels(bounds.height, 44);
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('Mobile context needs its device viewport');
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1);
    await captureMaintenanceCosts(page, info, `mobile-expense-recovery-${dark ? 'dark' : 'light'}`);
    await retry.tap();
    await expect(retry).toBeHidden();
    expect(state.expenses).toHaveLength(2);
    expect(state.expenses[1]).toEqual(state.expenses[0]);
    expect(state.committedExpenses).toBe(1);
    await expect(page.getByTestId('maintenance-frozen-total')).toHaveText('10.000000 EUR');
    await page.getByRole('tab', { name: 'Currency and hourly rates', exact: true }).tap();
    await expect(page.getByTestId('maintenance-rate-cards')).toBeVisible();
    await expect(page.getByTestId('maintenance-rate-cards')).toContainText(
      '9,007,199,254,740,993.123456 EUR',
    );
    await captureMaintenanceCosts(page, info, `mobile-private-settings-${dark ? 'dark' : 'light'}`);
  });
