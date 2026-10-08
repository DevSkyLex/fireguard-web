import { expect, test } from '@playwright/test';
import {
  captureProcurement,
  installProcurement,
  PROCUREMENT_EQUIPMENT_ID,
  PROCUREMENT_RECEIPT_ID,
  PROCUREMENT_RETURN_ID,
  PROCUREMENT_WAREHOUSE_ID,
  PROCUREMENT_SUPPLIER_NAME,
  PROCUREMENT_ARCHIVED_SUPPLIER_NAME,
} from '../support/helpers/procurement';
import { ProcurementPage } from '../support/pages/procurement.page';

test('browses active, archived and all suppliers using explicit server archive filters', async ({
  page,
}) => {
  const state = await installProcurement(page, { supplierDirectory: true });
  const purchases = new ProcurementPage(page);
  await purchases.goto();
  await expect(purchases.workspace).toContainText(PROCUREMENT_SUPPLIER_NAME);
  await expect(purchases.workspace).not.toContainText(PROCUREMENT_ARCHIVED_SUPPLIER_NAME);
  const filter = page.getByRole('combobox', { name: 'Supplier archive filter', exact: true });
  await filter.click();
  await page.getByRole('option', { name: 'Archived suppliers', exact: true }).click();
  await expect(purchases.workspace).toContainText(PROCUREMENT_ARCHIVED_SUPPLIER_NAME);
  await expect(purchases.workspace).not.toContainText(PROCUREMENT_SUPPLIER_NAME);
  await filter.click();
  await page.getByRole('option', { name: 'All suppliers', exact: true }).click();
  await expect(purchases.workspace).toContainText(PROCUREMENT_SUPPLIER_NAME);
  await expect(purchases.workspace).toContainText(PROCUREMENT_ARCHIVED_SUPPLIER_NAME);
  expect(state.supplierQueries).toEqual(['false', 'true', 'all']);
});

test('retains one exact partial delivery after response loss and reconciles a motivated physical return', async ({
  page,
}, info) => {
  const state = await installProcurement(page, { loseReceiptReply: true });
  const purchases = new ProcurementPage(page);
  await purchases.goto();
  await purchases.createSupplier();
  await purchases.prepareOrder();
  await captureProcurement(page, info, 'exact-part-purchase-draft');
  await purchases.saveAndPlaceOrder();
  await purchases.prepareReceipt();
  await captureProcurement(page, info, 'native-partial-receipt');
  await purchases.submitReceipt();
  await expect(purchases.retry).toBeVisible();
  await purchases.retry.click();
  await expect(purchases.editor).toBeHidden();
  expect(state.committedReceipts).toBe(1);
  expect(state.receiveAttempts).toHaveLength(2);
  expect(state.receiveAttempts[1]).toEqual(state.receiveAttempts[0]);
  expect(state.receiveAttempts[0]?.body).toMatchObject({
    quantity: '0.500001',
    warehouseId: PROCUREMENT_WAREHOUSE_ID,
  });
  await expect(purchases.detail).toContainText('Awaiting delivery: 0.500001 piece');
  await purchases.openReceipts();
  await purchases.prepareReturn();
  await purchases.submitReturn();
  const receipt = page.getByTestId('procurement-receipt-' + PROCUREMENT_RECEIPT_ID);
  await expect(receipt).toContainText('Return movement awaiting reconciliation: 0.250001 piece');
  await purchases.showReturnHistory();
  const returned = page.getByTestId('procurement-return-' + PROCUREMENT_RETURN_ID);
  await expect(returned).toContainText('Awaiting inventory reconciliation');
  const original = {
    quantity: state.returned?.quantity,
    reason: state.returned?.reason,
    clientOperationId: state.returned?.clientOperationId,
  };
  await captureProcurement(page, info, 'physical-return-awaiting-reconciliation');
  await returned.getByRole('button', { name: 'Reconcile inventory movement', exact: true }).click();
  await purchases.confirmOperation();
  await expect(purchases.confirmation).toBeHidden();
  await expect(returned).toContainText('Inventory reversal confirmed');
  await expect(receipt).not.toContainText('Return movement awaiting reconciliation');
  expect(state.committedReturns).toBe(1);
  expect(state.returned).toMatchObject(original);
  expect(state.reconcileAttempts[0]?.ifMatch).toBe('"revision-1"');
  await captureProcurement(page, info, 'partial-delivery-and-confirmed-return');
});

test('keeps a quota-blocked hardware receipt and creates one reserve identity through an explicit new attempt', async ({
  page,
}, info) => {
  const state = await installProcurement(page, { hardware: true });
  const purchases = new ProcurementPage(page);
  await purchases.goto();
  await purchases.createSupplier();
  await purchases.prepareOrder(true);
  await expect(purchases.editor.getByLabel('Internal unit cost', { exact: true })).toHaveCount(0);
  await captureProcurement(page, info, 'reserve-equipment-draft-without-financial-rights');
  await purchases.saveAndPlaceOrder();
  await purchases.prepareReceipt(true);
  await expect(purchases.editor.getByLabel('Receiving warehouse', { exact: true })).toHaveCount(0);
  await purchases.submitReceipt();
  await expect(purchases.editor).toBeHidden();
  await purchases.openReceipts();
  const receipt = page.getByTestId('procurement-receipt-' + PROCUREMENT_RECEIPT_ID);
  await expect(receipt).toContainText('Awaiting reserve equipment');
  await expect(receipt).not.toContainText('Internal unit cost');
  await receipt.getByRole('button', { name: 'Create reserve equipment', exact: true }).click();
  await purchases.confirmOperation();
  await expect(purchases.confirmation).toBeHidden();
  await expect(receipt).toContainText('organization quota was reached');
  expect(state.createdEquipment).toBe(0);
  expect(state.receipt?.quantity).toBe('1.000000');
  await captureProcurement(page, info, 'quota-blocked-retained-physical-receipt');
  await receipt.getByRole('button', { name: 'Create reserve equipment', exact: true }).click();
  await purchases.confirmOperation();
  await expect(purchases.retry).toBeVisible();
  await purchases.retry.click();
  await expect(purchases.confirmation).toBeHidden();
  expect(state.individualizeAttempts).toHaveLength(3);
  expect(state.individualizeAttempts[1]?.body.clientOperationId).not.toBe(
    state.individualizeAttempts[0]?.body.clientOperationId,
  );
  expect(state.individualizeAttempts[0]?.ifMatch).toBe('"revision-1"');
  expect(state.individualizeAttempts[1]?.ifMatch).toBe('"revision-2"');
  expect(state.individualizeAttempts[2]).toEqual(state.individualizeAttempts[1]);
  expect(state.createdEquipment).toBe(1);
  expect(state.receipt?.equipmentIds).toEqual([PROCUREMENT_EQUIPMENT_ID]);
  await expect(
    receipt.getByRole('link', { name: 'Open reserve equipment dossier', exact: true }),
  ).toHaveAttribute('href', new RegExp(PROCUREMENT_EQUIPMENT_ID + '$'));
  await captureProcurement(page, info, 'single-reserve-identity-after-response-recovery');
});
