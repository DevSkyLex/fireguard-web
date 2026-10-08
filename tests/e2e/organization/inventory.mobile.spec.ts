import { expect, test, type Locator } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  collectConsoleErrors,
  expectMinimumCssPixels,
  expectNoHorizontalOverflow,
  expectNoInternalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import {
  consumptionId,
  fixtures,
  json,
  mockInventory,
  movementId,
  type PhysicalInput,
} from '../support/helpers/inventory-scenario';
import { pagePolishScreenshotDir } from '../support/helpers/screenshot-dir';
import { ApiMock } from '../support/mocks/api-mock';

/** Checks the real critical action before tapping; phone actions require 44px targets. */
async function tapTouchAction(action: Locator): Promise<void> {
  await action.scrollIntoViewIfNeeded();
  const bounds = await action.boundingBox();
  if (!bounds) throw new Error('The stock action must be visible on the phone.');
  expectMinimumCssPixels(bounds.height, 44);
  await action.tap();
}

test.beforeEach(async ({ context, browserName }) => {
  await emulateMobilePlatform(context, browserName === 'webkit' ? 'ios' : 'android');
});

test.describe('Inventory with native phone interactions', () => {
  test('reconciles a full shortage declaration and records a fractional return using touch controls', async ({
    page,
  }, testInfo) => {
    const errors = collectConsoleErrors(page);
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
      permissions: [
        'organization.inventory.read',
        'organization.inventory.manage',
        'organization.inventory.consume',
        'organization.interventions.execute',
      ],
    });
    const data = fixtures();
    const commands: unknown[] = [];
    let reconciliations = 0;
    await mockInventory(page, data, async (route, resource, id) => {
      const input = route.request().postDataJSON() as PhysicalInput;
      commands.push(input);
      if (resource === 'inventory-consumptions' && id === consumptionId) {
        reconciliations++;
        if (reconciliations === 2) {
          data.consumption.status = 'confirmed';
          data.consumption.reason = undefined;
        }
        await json(route, 200, data.consumption);
        return;
      }
      if (resource === 'inventory-returns') {
        expect(input.consumptionId).toBe(consumptionId);
        data.movement = {
          ...data.movement,
          kind: 'return',
          quantity: input.quantity,
          reason: input.reason,
        };
        await json(route, 201, data.movement);
        return;
      }
      throw new Error('Unexpected mobile inventory mutation');
    });

    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/inventory/consumptions`);
    await expect(page.locator('html')).toHaveAttribute('data-interaction-mode', 'mobile');
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
    expect(await page.evaluate(() => navigator.maxTouchPoints)).toBeGreaterThan(0);
    const row = page.locator(`[data-inventory-id="${consumptionId}"]`);
    await expect(row).toContainText('Received — to reconcile');
    await expect(row).toContainText('3.000000');
    await tapTouchAction(row.getByRole('button', { name: 'Reconcile stock', exact: true }));
    await expect.poll(() => reconciliations).toBe(1);
    await expect(row).toContainText('Received — to reconcile');
    await expect(row).toContainText('3.000000');
    await expect(row.getByRole('button', { name: 'Record return', exact: true })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await expectNoInternalOverflow(row);

    await tapTouchAction(row.getByRole('button', { name: 'Reconcile stock', exact: true }));
    await expect(row).toContainText('Confirmed');
    await tapTouchAction(row.getByRole('button', { name: 'Record return', exact: true }));
    const editor = page.getByTestId('inventory-editor-sheet');
    const quantity = editor.getByLabel('Quantity', { exact: true });
    await expect(quantity).toHaveAttribute('inputmode', 'decimal');
    await quantity.tap();
    await quantity.fill('0.000001');
    await editor.getByLabel('Reason', { exact: true }).fill('Unused seal returned after repair');
    await expectNoInternalOverflow(editor);
    await page.screenshot({
      path: `${pagePolishScreenshotDir(testInfo.project.name)}/inventory-phone-return-editor-light.png`,
      animations: 'disabled',
    });
    await tapTouchAction(editor.getByRole('button', { name: 'Record movement', exact: true }));
    await expect(editor).toBeHidden();
    expect(commands).toEqual([
      {},
      {},
      expect.objectContaining({
        consumptionId,
        quantity: '0.000001',
        reason: 'Unused seal returned after repair',
        clientOperationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      }),
    ]);
    await page.getByRole('link', { name: 'Movement history', exact: true }).tap();
    const history = page.locator(`[data-inventory-id="${movementId}"]`);
    await expect(history).toContainText('Return');
    await expect(history).toContainText('0.000001');
    await expect(history).toContainText('Unused seal returned after repair');
    await expectNoHorizontalOverflow(page);
    await expectNoInternalOverflow(history);
    await page.screenshot({
      path: `${pagePolishScreenshotDir(testInfo.project.name)}/inventory-phone-return-history-light.png`,
      animations: 'disabled',
    });
    expect(errors).toEqual([]);
  });

  test('shows quantitative balances without exposing finance or mutation actions to a phone reader', async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    const errors = collectConsoleErrors(page);
    await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
      permissions: ['organization.inventory.read'],
    });
    await mockInventory(page, fixtures(), async () => {
      throw new Error('A stock reader must never mutate inventory');
    });
    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/inventory/balances`);
    await expect(page.locator('html')).toHaveAttribute('data-interaction-mode', 'mobile');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const balance = page.locator('[data-inventory-id="balance-1"]');
    await expect(balance).toContainText('1.000000');
    await expect(page.locator('app-inventory-dataview')).not.toContainText('9123');
    await expect(
      page.getByRole('button', { name: 'Record stock correction', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'New part or consumable', exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Economic pilotage', exact: true })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await expectNoInternalOverflow(balance);
    await page.screenshot({
      path: `${pagePolishScreenshotDir(testInfo.project.name)}/inventory-phone-quantity-reader-dark.png`,
      animations: 'disabled',
    });
    expect(errors).toEqual([]);
  });
});
