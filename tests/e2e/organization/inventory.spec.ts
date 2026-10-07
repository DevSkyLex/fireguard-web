import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  expectNoInternalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { pagePolishScreenshotDir } from '../support/helpers/screenshot-dir';
import { ApiMock } from '../support/mocks/api-mock';

import {
  partId,
  warehouseId,
  consumptionId,
  movementId,
  fixtures,
  json,
  mockInventory,
  type Part,
  type PhysicalInput,
  orgPath,
} from '../support/helpers/inventory-scenario';

test.describe('Inventory', () => {
  test('creates a quantitative consumable and archives then restores its permanent reference', async ({
    page,
  }, testInfo) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    const data = fixtures(),
      commands: unknown[] = [];
    await mockInventory(page, data, async (route, resource, id) => {
      const input = route.request().postDataJSON() as Partial<Part>;
      commands.push(input);
      if (resource !== 'inventory-parts') throw new Error('Unexpected inventory mutation');
      if (route.request().method() === 'POST') {
        const created: Part = {
          '@id': orgPath + '/inventory-parts/new-part',
          '@type': 'InventoryPart',
          id: 'new-part',
          code: input.code ?? '',
          label: input.label ?? '',
          unit: input.unit ?? '',
          kind: input.kind ?? 'part',
          archived: false,
        };
        data.parts.push(created);
        await json(route, 201, created);
        return;
      }
      const entry = data.parts.find((part) => part.id === id);
      if (!entry) throw new Error('Missing reference');
      Object.assign(entry, input);
      await json(route, 200, entry);
    });
    await page.goto('/organizations/' + E2E_ORGANIZATION_ID + '/inventory/parts');
    await page.getByRole('button', { name: 'New part or consumable', exact: true }).click();
    const editor = page.getByTestId('inventory-editor-sheet');
    await editor.locator('#inventory-reference-code').fill('CLEANER');
    await editor.locator('#inventory-reference-name').fill('Cleaning solution');
    await editor.locator('#inventory-reference-unit').fill('litre');
    await editor.getByRole('button', { name: 'Consumable', exact: true }).click();
    await editor.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(editor).toBeHidden();
    const row = page.locator('[data-inventory-id="new-part"]');
    await expect(row).toContainText('Cleaning solution');
    await expect(row).toContainText('Consumable');
    await row.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(editor.locator('#inventory-reference-code')).toBeDisabled();
    await expect(editor.getByRole('button', { name: 'Consumable', exact: true })).toBeDisabled();
    await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
    await row.getByRole('button', { name: 'Archive', exact: true }).click();
    await expect(row).toHaveCount(0);
    await page.getByRole('button', { name: 'Archived', exact: true }).click();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Restore', exact: true }).click();
    await expect(row).toHaveCount(0);
    await page.getByRole('button', { name: 'Active', exact: true }).click();
    await expect(row).toBeVisible();
    expect(commands).toEqual([
      { code: 'CLEANER', label: 'Cleaning solution', unit: 'litre', kind: 'consumable' },
      { archived: true },
      { archived: false },
    ]);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: pagePolishScreenshotDir(testInfo.project.name) + '/inventory-references-light.png',
      animations: 'disabled',
    });
  });

  test('keeps a shortage declaration intact until a full reconciliation and records a motivated return', async ({
    page,
  }, testInfo) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    const data = fixtures(),
      commands: unknown[] = [];
    let attempts = 0;
    await mockInventory(page, data, async (route, resource, id) => {
      const input = route.request().postDataJSON() as PhysicalInput;
      commands.push(input);
      if (resource === 'inventory-consumptions' && id === consumptionId) {
        attempts++;
        if (attempts === 2) {
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
      throw new Error('Unexpected inventory mutation');
    });
    await page.goto('/organizations/' + E2E_ORGANIZATION_ID + '/inventory/consumptions');
    const row = page.locator('[data-inventory-id="' + consumptionId + '"]');
    await expect(row).toContainText('Received — to reconcile');
    await expect(row).toContainText('3.000000');
    await row.getByRole('button', { name: 'Reconcile stock', exact: true }).click();
    await expect.poll(() => attempts).toBe(1);
    await expect(row).toContainText('Received — to reconcile');
    await expect(row).toContainText('3.000000');
    await expect(row.getByRole('button', { name: 'Record return', exact: true })).toHaveCount(0);
    await row.getByRole('button', { name: 'Reconcile stock', exact: true }).click();
    await expect(row).toContainText('Confirmed');
    await row.getByRole('button', { name: 'Record return', exact: true }).click();
    const editor = page.getByTestId('inventory-editor-sheet');
    await editor.locator('#inventory-movement-quantity').fill('1.25');
    await editor
      .locator('#inventory-movement-reason')
      .fill('Unused part returned to the service van');
    await editor.getByRole('button', { name: 'Record movement', exact: true }).click();
    await expect(editor).toBeHidden();
    expect(commands[0]).toEqual({});
    expect(commands[1]).toEqual({});
    expect(commands[2]).toEqual(
      expect.objectContaining({
        consumptionId,
        quantity: '1.250000',
        reason: 'Unused part returned to the service van',
        clientOperationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      }),
    );
    await page.getByRole('link', { name: 'Movement history', exact: true }).click();
    const history = page.locator('[data-inventory-id="' + movementId + '"]');
    await expect(history).toContainText('Return');
    await expect(history).toContainText('1.250000');
    await expect(history).toContainText('Unused part returned to the service van');
    await page.screenshot({
      path: pagePolishScreenshotDir(testInfo.project.name) + '/inventory-return-history-light.png',
      animations: 'disabled',
    });
  });

  test('recovers a committed correction after a lost response and page reload on a narrow dark viewport', async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    const errors = collectConsoleErrors(page);
    await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await page.setViewportSize({ width: 375, height: 812 });
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    const data = fixtures(),
      received: PhysicalInput[] = [];
    let commits = 0;
    await mockInventory(page, data, async (route, resource) => {
      if (resource !== 'inventory-corrections') throw new Error('Unexpected inventory mutation');
      const input = route.request().postDataJSON() as PhysicalInput;
      received.push(input);
      if (received.length === 1) {
        commits++;
        await route.abort('failed');
        return;
      }
      expect(input).toEqual(received[0]);
      await json(route, 200, {
        ...data.movement,
        quantity: input.quantity,
        reason: input.reason,
        replayed: true,
      });
    });
    await page.goto('/organizations/' + E2E_ORGANIZATION_ID + '/inventory/balances');
    await expect(page.locator('app-inventory-dataview')).not.toContainText('9123');
    await page.getByRole('button', { name: 'Record stock correction', exact: true }).click();
    const editor = page.getByTestId('inventory-editor-sheet');
    await editor.locator('#inventory-correction-part').click();
    await editor.locator('#inventory-correction-part').fill('Valve');
    await expect(page.getByRole('option', { name: /Valve seal/ })).toBeVisible();
    await page.getByRole('option', { name: /Valve seal/ }).click();
    await editor.locator('#inventory-correction-warehouse').fill('Service');
    await page.getByRole('option', { name: /Service van/ }).click();
    await editor.locator('#inventory-movement-quantity').fill('0.000001');
    await editor
      .locator('#inventory-movement-reason')
      .fill('Physical stock count after a replacement');
    await editor.locator('#inventory-movement-quantity').focus();
    await page.keyboard.press('Tab');
    await expect(editor.locator('#inventory-movement-reason')).toBeFocused();
    await expectNoInternalOverflow(editor);
    await page.screenshot({
      path:
        pagePolishScreenshotDir(testInfo.project.name) +
        '/inventory-correction-editor-narrow-dark.png',
      animations: 'disabled',
    });
    await editor.getByRole('button', { name: 'Record movement', exact: true }).click();
    await expect(
      editor.getByText('The operation could not be confirmed', { exact: true }),
    ).toBeVisible();
    await expect.poll(() => received.length).toBe(1);
    await editor
      .getByRole('button', { name: 'Close', exact: true })
      .filter({ hasText: 'Close' })
      .first()
      .click();
    await expect(editor).toBeHidden();
    await page.reload();
    const retained = page.locator('[data-inventory-operation]');
    await expect(retained).toHaveCount(1);
    await expect(retained).toContainText('0.000001');
    await expectNoHorizontalOverflow(page);
    await expectNoInternalOverflow(retained);
    await page.screenshot({
      path:
        pagePolishScreenshotDir(testInfo.project.name) +
        '/inventory-correction-recovery-narrow-dark.png',
      animations: 'disabled',
    });
    await retained.getByRole('button', { name: 'Retry saved movement', exact: true }).click();
    await expect(retained).toHaveCount(0);
    expect(received).toHaveLength(2);
    expect(received[1]).toEqual(received[0]);
    expect(commits).toBe(1);
    expect(received[0]).toEqual(
      expect.objectContaining({ quantity: '0.000001', partId, warehouseId }),
    );
    expect(
      errors.filter((error) => !error.includes('net::ERR_FAILED')),
      errors.join('\n'),
    ).toEqual([]);
  });

  test('does not expose stock corrections to reference administrators without financial rights', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
      permissions: ['organization.inventory.read', 'organization.inventory.manage'],
    });
    const data = fixtures();
    await mockInventory(page, data, async () => {
      throw new Error('A read-only browser action must not mutate stock');
    });
    await page.goto('/organizations/' + E2E_ORGANIZATION_ID + '/inventory/balances');
    await expect(page.locator('[data-inventory-id="balance-1"]')).toContainText('1.000000');
    await expect(
      page.getByRole('button', { name: 'Record stock correction', exact: true }),
    ).toHaveCount(0);
    await expect(page.locator('app-inventory-dataview')).not.toContainText('9123');
  });
});
