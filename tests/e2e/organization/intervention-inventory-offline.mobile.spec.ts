import { expect, test } from '@playwright/test';
import { E2E_INTERVENTION_ID } from '../support/fixtures/intervention-fixtures';
import {
  collectConsoleErrors,
  expectMinimumCssPixels,
  expectNoHorizontalOverflow,
  expectNoInternalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import {
  ACCOUNT_ID,
  arrangeInventory,
  openPreparedInventory,
} from '../support/helpers/intervention-inventory-scenario';
import { readOutboxOperations, setAppOffline, setAppOnline } from '../support/helpers/offline';
import { pagePolishScreenshotDir } from '../support/helpers/screenshot-dir';

test.beforeEach(async ({ context, browserName }) => {
  await emulateMobilePlatform(context, browserName === 'webkit' ? 'ios' : 'android');
});

test.describe('Physical stock declarations on an offline phone', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`retains the exact consumption UUID through an offline reload and shows reconciliation separately in ${theme} mode`, async ({
      page,
      context,
      baseURL,
    }, testInfo) => {
      const errors = collectConsoleErrors(page);
      if (theme === 'dark') await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
      const { path, mock } = await arrangeInventory(page);
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-interaction-mode', 'mobile');
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
      const section = await openPreparedInventory(page);
      await expect(page.getByTestId('intervention-maintenance-cost-link')).toHaveCount(0);
      await setAppOffline(page);

      const part = section.getByRole('combobox', { name: 'Part', exact: true });
      await part.tap();
      await part.fill('SEAL');
      const partOption = page.getByRole('option', {
        name: 'Valve seal · SEAL · piece',
        exact: true,
      });
      await expect(partOption).toBeVisible();
      await page.screenshot({
        path: `${pagePolishScreenshotDir(testInfo.project.name)}/intervention-stock-phone-part-picker-${theme}.png`,
        animations: 'disabled',
      });
      await partOption.tap();
      const warehouse = section.getByRole('combobox', { name: 'Warehouse', exact: true });
      await warehouse.tap();
      await warehouse.fill('VAN');
      await page.getByRole('option', { name: 'Service van · VAN', exact: true }).tap();
      const quantity = section.getByLabel('Quantity used', { exact: true });
      await expect(quantity).toHaveAttribute('inputmode', 'decimal');
      await quantity.tap();
      await quantity.fill('0.25');
      const submit = section.getByRole('button', { name: 'Declare consumption', exact: true });
      await submit.scrollIntoViewIfNeeded();
      const submitBox = await submit.boundingBox();
      if (!submitBox) throw new Error('The consumption action must be visible on the phone.');
      expectMinimumCssPixels(submitBox.height, 44);
      await expectNoHorizontalOverflow(page);
      await expectNoInternalOverflow(section);
      await submit.tap();

      await expect
        .poll(async () => (await readOutboxOperations(page, E2E_INTERVENTION_ID)).length)
        .toBe(1);
      const [queued] = await readOutboxOperations(page, E2E_INTERVENTION_ID);
      if (!queued)
        throw new Error('The physical declaration must be safely persisted before reset.');
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
      await expect(quantity).toHaveValue('');
      expect(mock.writes).toEqual([]);

      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
      });
      await page.reload();
      await page.getByTestId('intervention-inventory-toggle').tap();
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
      expect(mock.receipts).toHaveLength(1);
      await expectNoHorizontalOverflow(page);
      await expectNoInternalOverflow(section);
      await section
        .getByText('Received — reconciliation needed', { exact: true })
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `${pagePolishScreenshotDir(testInfo.project.name)}/intervention-stock-phone-reconciliation-${theme}.png`,
        animations: 'disabled',
      });
      expect(errors).toEqual([]);
    });
  }

  test('replays a committed consumption after a lost response and offline reload with its original UUID and physical timestamp', async ({
    page,
  }, testInfo) => {
    const errors = collectConsoleErrors(page);
    const { path, mock } = await arrangeInventory(page);
    mock.loseNextCommittedResponse = true;
    await page.goto(path);
    const section = await openPreparedInventory(page);
    await setAppOffline(page);
    const part = section.getByRole('combobox', { name: 'Part', exact: true });
    await part.tap();
    await part.fill('SEAL');
    await page.getByRole('option', { name: 'Valve seal · SEAL · piece', exact: true }).tap();
    const warehouse = section.getByRole('combobox', { name: 'Warehouse', exact: true });
    await warehouse.tap();
    await warehouse.fill('VAN');
    await page.getByRole('option', { name: 'Service van · VAN', exact: true }).tap();
    await section.getByLabel('Quantity used', { exact: true }).fill('0.000001');
    await section.getByRole('button', { name: 'Declare consumption', exact: true }).tap();
    await expect
      .poll(async () => (await readOutboxOperations(page, E2E_INTERVENTION_ID)).length)
      .toBe(1);
    const [original] = await readOutboxOperations(page, E2E_INTERVENTION_ID);
    if (!original) throw new Error('The physical declaration must already be durable.');
    const originalPayload = original.payload;
    expect(originalPayload['quantity']).toBe('0.000001');
    expect(originalPayload['actorId']).toBe(ACCOUNT_ID);

    await setAppOnline(page);
    await expect.poll(() => mock.writes.length).toBe(1);
    await expect.poll(() => mock.receipts.length).toBe(1);
    await setAppOffline(page);
    const uncertain = await readOutboxOperations(page, E2E_INTERVENTION_ID);
    expect(uncertain).toHaveLength(1);
    expect(uncertain[0]?.payload).toEqual(originalPayload);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    });
    await page.reload();
    await page.getByTestId('intervention-inventory-toggle').tap();
    await expect(
      section.getByText(/^Queued locally — (awaiting synchronization|retry needed)$/),
    ).toBeVisible();
    const restored = await readOutboxOperations(page, E2E_INTERVENTION_ID);
    expect(restored).toHaveLength(1);
    expect(restored[0]?.id).toBe(original.id);
    expect(restored[0]?.payload).toEqual(originalPayload);
    expect(mock.writes).toHaveLength(1);
    expect(mock.receipts).toHaveLength(1);

    await setAppOnline(page);
    await expect.poll(() => mock.writes.length).toBe(2);
    await expect
      .poll(async () => (await readOutboxOperations(page, E2E_INTERVENTION_ID)).length)
      .toBe(0);
    expect(mock.writes[1]).toEqual(mock.writes[0]);
    expect(mock.writes[1]).toMatchObject({
      clientOperationId: originalPayload['clientOperationId'],
      quantity: '0.000001',
      occurredAt: originalPayload['occurredAt'],
    });
    expect(mock.writes[1]).not.toHaveProperty('actorId');
    expect(mock.writes[1]).not.toHaveProperty('clientId');
    expect(mock.receipts).toHaveLength(1);
    await expect(
      section.getByText('Received — reconciliation needed', { exact: true }),
    ).toHaveCount(1);
    await expect(section).toContainText('0.000001');
    await expectNoHorizontalOverflow(page);
    await expectNoInternalOverflow(section);
    await section
      .getByText('Received — reconciliation needed', { exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `${pagePolishScreenshotDir(testInfo.project.name)}/intervention-stock-phone-response-replay.png`,
      animations: 'disabled',
    });
    expect(
      errors.filter((error) => !error.includes('net::ERR_FAILED')),
      errors.join('\n'),
    ).toEqual([]);
  });
});
