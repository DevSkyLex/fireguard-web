import { expect, test } from '@playwright/test';
import { expectMinimumCssPixels, setDarkTheme } from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { captureProcurement, installProcurement } from '../support/helpers/procurement';
import { ProcurementPage } from '../support/pages/procurement.page';

for (const dark of [false, true]) {
  test(`keeps exact purchase, delivery and response recovery reachable by touch in ${dark ? 'dark' : 'light'} mode`, async ({
    page,
    context,
    baseURL,
  }, info) => {
    await emulateMobilePlatform(context, info.project.name.includes('Safari') ? 'ios' : 'android');
    if (dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    const state = await installProcurement(page, { loseReceiptReply: true });
    const purchases = new ProcurementPage(page);
    await purchases.goto();
    await purchases.createSupplier();
    await purchases.prepareOrder();
    await captureProcurement(page, info, 'touch-purchase-draft-' + (dark ? 'dark' : 'light'));
    await purchases.saveAndPlaceOrder();
    await purchases.prepareReceipt();
    await captureProcurement(page, info, 'touch-partial-delivery-' + (dark ? 'dark' : 'light'));
    await purchases.submitReceipt();
    await expect(purchases.retry).toBeVisible();
    await purchases.retry.scrollIntoViewIfNeeded();
    const bounds = await purchases.retry.boundingBox();
    if (!bounds)
      throw new Error('The physical-operation recovery action needs visible touch bounds.');
    expectMinimumCssPixels(bounds.height, 44);
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('The mobile project needs its real device viewport.');
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1);
    await purchases.retry.tap();
    await expect(purchases.editor).toBeHidden();
    expect(state.receiveAttempts[1]).toEqual(state.receiveAttempts[0]);
    expect(state.committedReceipts).toBe(1);
    await purchases.openReceipts();
    await purchases.prepareReturn();
    await captureProcurement(page, info, 'touch-motivated-return-' + (dark ? 'dark' : 'light'));
    await purchases.submitReturn();
    await purchases.showReturnHistory();
    await expect(page.getByTestId('procurement-returns')).toContainText(
      'Awaiting inventory reconciliation',
    );
    await page.getByTestId('procurement-returns').scrollIntoViewIfNeeded();
    await captureProcurement(page, info, 'touch-return-history-' + (dark ? 'dark' : 'light'));
  });
}
