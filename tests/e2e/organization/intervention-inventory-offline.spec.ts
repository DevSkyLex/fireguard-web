import { expect, test } from '@playwright/test';
import { E2E_INTERVENTION_ID } from '../support/fixtures/intervention-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  expectNoInternalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import {
  ACCOUNT_ID,
  arrangeInventory,
  openPreparedInventory,
  fillConsumption,
  captureInventory,
} from '../support/helpers/intervention-inventory-scenario';
import {
  readOutboxOperations,
  readStore,
  setAppOffline,
  setAppOnline,
} from '../support/helpers/offline';

test.describe('Parts used in an offline intervention dossier', () => {
  for (const scenario of [
    { width: 1280, theme: 'light' },
    { width: 375, theme: 'light' },
    { width: 375, theme: 'dark' },
  ] as const) {
    test(`retains a decimal consumption offline and separates synchronization from stock reconciliation at ${scenario.width}px in ${scenario.theme} mode`, async ({
      page,
      context,
      baseURL,
    }) => {
      await page.setViewportSize({ width: scenario.width, height: 900 });
      if (scenario.theme === 'dark')
        await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
      const errors = collectConsoleErrors(page);
      const { path, mock } = await arrangeInventory(page);
      await page.goto(path);
      const section = await openPreparedInventory(page);
      const inventoryMetadata = (await readStore(page, 'metadata')).filter(
        (value) =>
          (value as Record<string, unknown>)['version'] === 1 &&
          (value as Record<string, unknown>)['catalogComplete'] === true,
      );
      expect(inventoryMetadata).toHaveLength(1);
      expect(JSON.stringify(inventoryMetadata)).not.toMatch(
        /valuation|unitCost|totalValue|currency/,
      );
      await expect(page.getByTestId('intervention-maintenance-cost-link')).toHaveCount(0);
      await setAppOffline(page);
      await fillConsumption(page, section);
      await expectNoHorizontalOverflow(page);
      await expectNoInternalOverflow(section);
      await captureInventory(page, section, 'form');

      await page.getByTestId('intervention-inventory-toggle').click();
      await expect(section.getByLabel('Quantity used', { exact: true })).toBeHidden();
      await page.getByTestId('intervention-inventory-toggle').click();
      await expect(section.getByRole('combobox', { name: 'Part', exact: true })).toHaveValue(
        'Valve seal',
      );
      await expect(section.getByRole('combobox', { name: 'Warehouse', exact: true })).toHaveValue(
        'Service van',
      );
      await expect(section.getByLabel('Quantity used', { exact: true })).toHaveValue('0.25');
      await section.getByRole('button', { name: 'Declare consumption', exact: true }).click();

      await expect
        .poll(async () => (await readOutboxOperations(page, E2E_INTERVENTION_ID)).length)
        .toBe(1);
      const [queued] = await readOutboxOperations(page, E2E_INTERVENTION_ID);
      if (!queued) throw new Error('The physical declaration must be durably queued.');
      expect(queued.type).toBe('inventory-consumption.declare');
      expect(queued.payload['clientOperationId']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(queued.id).toBe(`inventory:${queued.payload['clientOperationId']}`);
      expect(queued.payload).toMatchObject({
        partId: mock.parts[0]?.id,
        warehouseId: mock.warehouses[0]?.id,
        quantity: '0.250000',
        interventionId: E2E_INTERVENTION_ID,
        actorId: ACCOUNT_ID,
      });
      await expect(
        section.getByText('Queued locally — awaiting synchronization', { exact: true }),
      ).toBeVisible();
      await expect(section.getByLabel('Quantity used', { exact: true })).toHaveValue('');
      expect(mock.writes).toEqual([]);
      await captureInventory(page, section, 'queued');

      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
      });
      await page.reload();
      await page.getByTestId('intervention-inventory-toggle').click();
      await expect(
        section.getByText('Queued locally — awaiting synchronization', { exact: true }),
      ).toBeVisible();
      const persisted = await readOutboxOperations(page, E2E_INTERVENTION_ID);
      expect(persisted).toHaveLength(1);
      expect(persisted[0]?.payload).toEqual(queued.payload);
      expect(mock.writes).toEqual([]);
      await expect(page.getByTestId('intervention-maintenance-cost-link')).toHaveCount(0);

      await setAppOnline(page);
      await expect.poll(() => mock.writes.length).toBe(1);
      expect(mock.writes[0]).toMatchObject({
        clientOperationId: queued.payload['clientOperationId'],
        partId: queued.payload['partId'],
        warehouseId: queued.payload['warehouseId'],
        quantity: '0.250000',
        interventionId: E2E_INTERVENTION_ID,
        occurredAt: queued.payload['occurredAt'],
      });
      expect(mock.writes[0]).not.toHaveProperty('actorId');
      expect(mock.writes[0]).not.toHaveProperty('clientId');
      await expect
        .poll(async () => (await readOutboxOperations(page, E2E_INTERVENTION_ID)).length)
        .toBe(0);
      await expect(
        section.getByText('Queued locally — awaiting synchronization', { exact: true }),
      ).toHaveCount(0);
      await expect(
        section.getByText('Received — reconciliation needed', { exact: true }),
      ).toBeVisible();
      await expect(section).toContainText('0.250000');
      await expect
        .poll(async () =>
          (await readStore(page, 'metadata')).some((entry) => {
            const saved = entry as {
              readonly interventionId?: string;
              readonly declarations?: readonly {
                readonly status: string;
                readonly quantity: string;
              }[];
            };
            return (
              saved.interventionId === E2E_INTERVENTION_ID &&
              saved.declarations?.some(
                (fact) => fact.status === 'received_pending' && fact.quantity === '0.250000',
              ) === true
            );
          }),
        )
        .toBe(true);
      await expectNoHorizontalOverflow(page);
      await expectNoInternalOverflow(section);
      await captureInventory(page, section, 'reconciliation');
      expect(errors).toEqual([]);
    });
  }

  test('keeps a consumption after a device quota failure and cancels departure before retrying the same fact', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const { path, mock } = await arrangeInventory(page);
    await page.goto(path);
    const section = await openPreparedInventory(page);
    await setAppOffline(page);
    await page.evaluate(() => {
      const fault = { enabled: true, attempts: [] as Record<string, unknown>[] };
      Object.assign(window, { inventoryOutboxTestFault: fault });
      const original = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (
        value: unknown,
        key?: IDBValidKey,
      ): IDBRequest<IDBValidKey> {
        const operation = value as {
          readonly type?: string;
          readonly payload?: Record<string, unknown>;
        };
        if (this.name === 'outbox' && operation.type === 'inventory-consumption.declare') {
          fault.attempts.push({ ...operation.payload });
          if (fault.enabled)
            throw new DOMException('Device storage is full.', 'QuotaExceededError');
        }
        return key === undefined ? original.call(this, value) : original.call(this, value, key);
      };
    });
    await fillConsumption(page, section);
    await section.getByRole('button', { name: 'Declare consumption', exact: true }).click();
    await expect(page.getByTestId('intervention-inventory-not-saved')).toBeVisible();
    await expect(section.getByLabel('Quantity used', { exact: true })).toHaveValue('0.25');
    await expect(section.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
    expect(await readOutboxOperations(page, E2E_INTERVENTION_ID)).toEqual([]);

    await page
      .getByRole('link', { name: 'Interventions', exact: true })
      .filter({ visible: true })
      .first()
      .click();
    const warning = page.getByTestId('unsaved-changes-dialog');
    await expect(warning).toBeVisible();
    await warning.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(warning).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByTestId('intervention-inventory-not-saved')).toBeVisible();

    await page.evaluate(() => {
      const state = window as Window & { inventoryOutboxTestFault?: { enabled: boolean } };
      if (!state.inventoryOutboxTestFault) throw new Error('The storage fault must be installed.');
      state.inventoryOutboxTestFault.enabled = false;
    });
    await section.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect
      .poll(async () => (await readOutboxOperations(page, E2E_INTERVENTION_ID)).length)
      .toBe(1);
    await expect(page.getByTestId('intervention-inventory-not-saved')).toHaveCount(0);
    await expect(
      section.getByText('Queued locally — awaiting synchronization', { exact: true }),
    ).toBeVisible();
    const attempts = await page.evaluate(() => {
      const state = window as Window & {
        inventoryOutboxTestFault?: { attempts: readonly Record<string, unknown>[] };
      };
      if (!state.inventoryOutboxTestFault) throw new Error('The storage fault must be installed.');
      return state.inventoryOutboxTestFault.attempts;
    });
    expect(attempts).toHaveLength(2);
    expect(attempts[1]).toEqual(attempts[0]);
    expect(attempts[0]?.['quantity']).toBe('0.250000');
    expect(mock.writes).toEqual([]);
    await setAppOnline(page);
    await expect.poll(() => mock.writes.length).toBe(1);
    expect(mock.writes[0]?.clientOperationId).toBe(attempts[0]?.['clientOperationId']);
    expect(mock.writes[0]?.occurredAt).toBe(attempts[0]?.['occurredAt']);
    await expect
      .poll(async () => (await readOutboxOperations(page, E2E_INTERVENTION_ID)).length)
      .toBe(0);
    await expect(
      section.getByText('Received — reconciliation needed', { exact: true }),
    ).toBeVisible();
    await captureInventory(page, section, 'quota-retry');
  });

  test('shows a late retained stock fact in a published dossier without financial values or consumption rights', async ({
    page,
  }) => {
    const { path, mock } = await arrangeInventory(page, { status: 'published', canConsume: false });
    const part = mock.parts[0],
      warehouse = mock.warehouses[0];
    if (!part || !warehouse)
      throw new Error('The late physical fact requires real stock references.');
    mock.receipts.push({
      '@id': `${mock.parts[0]?.['@id']?.split('/inventory-parts/')[0]}/inventory-consumptions/late-receipt`,
      '@type': 'InventoryConsumption',
      id: 'late-receipt',
      partId: part.id,
      warehouseId: warehouse.id,
      quantity: '0.250000',
      interventionId: E2E_INTERVENTION_ID,
      actorId: ACCOUNT_ID,
      occurredAt: new Date().toISOString(),
      status: 'received_pending',
      reason: 'insufficient_stock',
      late: true,
      replayed: false,
    });
    await page.goto(path);
    await page.getByTestId('intervention-inventory-toggle').click();
    const section = page.getByTestId('intervention-inventory-section');
    const lateNotice = section.getByText(
      'Recorded after publication; the published dossier remains unchanged.',
      { exact: true },
    );
    await expect(lateNotice).toBeVisible();
    await expect(
      section.getByText('Received — reconciliation needed', { exact: true }),
    ).toBeVisible();
    await expect(section.getByLabel('Quantity used', { exact: true })).toBeHidden();
    await expect(
      section.getByRole('button', { name: 'Declare consumption', exact: true }),
    ).toBeHidden();
    await expect(page.getByTestId('intervention-maintenance-cost-link')).toHaveCount(0);
    expect(mock.writes).toEqual([]);
    await expect
      .poll(async () =>
        (await readStore(page, 'metadata')).some((value) => {
          const saved = value as {
            readonly version?: number;
            readonly declarations?: readonly { readonly id: string; readonly late: boolean }[];
          };
          return (
            saved.version === 1 &&
            saved.declarations?.some((item) => item.id === 'late-receipt' && item.late) === true
          );
        }),
      )
      .toBe(true);
    const saved = (await readStore(page, 'metadata')).filter(
      (value) => (value as Record<string, unknown>)['version'] === 1,
    );
    expect(JSON.stringify(saved)).not.toMatch(/valuation|unitCost|totalValue|currency/);
    await lateNotice.scrollIntoViewIfNeeded();
    await expectNoHorizontalOverflow(page);
    await expectNoInternalOverflow(section);
    await page.screenshot({
      path: 'tests/e2e/artifacts/intervention-inventory/published-late-quantity-only.png',
      animations: 'disabled',
    });
  });
});
