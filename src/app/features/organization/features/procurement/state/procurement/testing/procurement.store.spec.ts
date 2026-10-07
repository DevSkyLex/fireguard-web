import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { ProcurementService } from '@features/organization/features/procurement/data-access';
import type {
  SupplierOutput,
  PurchaseOrderOutput,
  ProcurementReceiptOutput,
  ProcurementReturnOutput,
  ReceivePurchaseOrderInput,
} from '@features/organization/features/procurement/models';
import { ProcurementStore } from '../procurement.store';
const supplier: SupplierOutput = {
  '@id': '/suppliers/supplier',
  '@type': 'Procurement',
  id: 'supplier',
  organizationId: 'org',
  name: 'Fire supplies',
  contacts: [],
  revision: 3,
  createdAt: '2026-10-05T10:00:00Z',
  updatedAt: '2026-10-05T10:00:00Z',
  replayed: false,
};
const order: PurchaseOrderOutput = {
  '@id': '/orders/order',
  '@type': 'Procurement',
  id: 'order',
  organizationId: 'org',
  supplierId: 'supplier',
  name: 'Consumables and reserve equipment',
  currency: 'EUR',
  status: 'ordered',
  lines: [],
  financialVisible: false,
  revision: 7,
  createdAt: '2026-10-05T10:00:00Z',
  updatedAt: '2026-10-05T10:00:00Z',
  replayed: false,
};
const receipt: ProcurementReceiptOutput = {
  '@id': '/receipts/receipt',
  '@type': 'Procurement',
  id: 'receipt',
  organizationId: 'org',
  orderId: 'order',
  lineId: 'line',
  kind: 'part',
  quantity: '0.250000',
  warehouseId: 'warehouse',
  currency: 'EUR',
  receivedAt: '2026-10-05T10:00:00Z',
  createdAt: '2026-10-05T10:00:00Z',
  inventoryMovementId: 'movement',
  equipmentIds: [],
  returnedQuantity: '0.000000',
  pendingReturnQuantity: '0.000000',
  status: 'stock_received',
  revision: 2,
  financialVisible: false,
  replayed: false,
};

const returned: ProcurementReturnOutput = {
  '@id': '/returns/returned',
  '@type': 'ProcurementReturn',
  id: 'returned',
  organizationId: 'org',
  receiptId: 'receipt',
  clientOperationId: 'd3b2f4b4-fb84-458b-8e65-e340d84ae97f',
  quantity: '0.050000',
  reason: 'Damaged packaging',
  status: 'awaiting_reconciliation',
  inventoryMovementId: null,
  blockedReason: 'insufficient_stock',
  createdAt: '2026-10-05T10:00:00Z',
  reconciledAt: null,
  revision: 4,
  replayed: false,
};

describe('ProcurementStore', () => {
  let store: InstanceType<typeof ProcurementStore>;
  let service: {
    listSuppliers: ReturnType<typeof vi.fn>;
    listOrders: ReturnType<typeof vi.fn>;
    readOrder: ReturnType<typeof vi.fn>;
    readReceipt: ReturnType<typeof vi.fn>;
    readReturn: ReturnType<typeof vi.fn>;
    listReceipts: ReturnType<typeof vi.fn>;
    receiveOrder: ReturnType<typeof vi.fn>;
    individualizeReceipt: ReturnType<typeof vi.fn>;
    returnReceipt: ReturnType<typeof vi.fn>;
    listReturns: ReturnType<typeof vi.fn>;
    reconcileReturn: ReturnType<typeof vi.fn>;
    createSupplier: ReturnType<typeof vi.fn>;
  };
  let dispatch: ReturnType<typeof vi.fn>;
  const input: ReceivePurchaseOrderInput = {
    lineId: 'line',
    warehouseId: 'warehouse',
    quantity: '0.250000',
    receivedAt: '2026-10-05T12:00:00+02:00',
    clientOperationId: '70ecb419-6dfb-4399-9d06-3d9e9540c053',
  };
  beforeEach(() => {
    service = {
      listSuppliers: vi.fn().mockReturnValue(of({ member: [supplier], totalItems: 1 })),
      listOrders: vi.fn().mockReturnValue(of({ member: [order], totalItems: 1 })),
      readOrder: vi.fn().mockReturnValue(of(order)),
      readReceipt: vi.fn().mockReturnValue(of(receipt)),
      readReturn: vi.fn().mockReturnValue(of(returned)),
      listReceipts: vi.fn().mockReturnValue(of({ member: [receipt], totalItems: 1 })),
      receiveOrder: vi.fn().mockReturnValue(of(receipt)),
      individualizeReceipt: vi.fn().mockReturnValue(of(receipt)),
      returnReceipt: vi.fn().mockReturnValue(of(receipt)),
      listReturns: vi.fn().mockReturnValue(of({ member: [returned], totalItems: 1 })),
      reconcileReturn: vi.fn().mockReturnValue(of(returned)),
      createSupplier: vi.fn().mockReturnValue(of(supplier)),
    };
    dispatch = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        ProcurementStore,
        { provide: ProcurementService, useValue: service },
        { provide: Dispatcher, useValue: { dispatch } },
      ],
    });
    store = TestBed.inject(ProcurementStore);
    store.setScope('org');
  });
  it('retains server pagination counts and cancels superseded supplier searches', () => {
    const stale = new Subject<HydraCollection<SupplierOutput>>();
    service.listSuppliers.mockReturnValueOnce(stale);
    store.loadSuppliers({ organizationId: 'org', options: { search: 'old' } });
    store.loadSuppliers({ organizationId: 'org', options: { search: 'fire' } });
    stale.next({ '@id': '/suppliers', '@type': 'Collection', member: [], totalItems: 90 });
    expect(store.supplierEntities()).toEqual([supplier]);
    expect(store.totalSuppliers()).toBe(1);
  });
  it('ignores an earlier visit response even after switching away and back to the same organization', () => {
    const stale = new Subject<PurchaseOrderOutput>();
    service.readOrder.mockReturnValueOnce(stale);
    store.readOrder({ organizationId: 'org', orderId: 'order' });
    store.setScope('another');
    store.setScope('org');
    stale.next(order);
    expect(store.selectedOrder()).toBeNull();
  });
  it('keeps one accepted physical command running despite a duplicate click', () => {
    const accepted = new Subject<ProcurementReceiptOutput>();
    service.receiveOrder.mockReturnValue(accepted);
    store.execute({ kind: 'receive', organizationId: 'org', order, input });
    store.execute({
      kind: 'receive',
      organizationId: 'org',
      order,
      input: { ...input, quantity: '1.000000' },
    });
    expect(service.receiveOrder).toHaveBeenCalledTimes(1);
    expect(store.commandPending()).toBe(true);
    accepted.next(receipt);
    expect(store.commandCallState().status).toBe('success');
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
  it('replays the exact uncertain declaration and original revision instead of a newly edited payload', () => {
    service.receiveOrder.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );
    store.execute({ kind: 'receive', organizationId: 'org', order, input });
    expect(store.uncertainCommand()).toBe(true);
    store.clearCommand();
    expect(store.command()).not.toBeNull();
    store.execute({
      kind: 'receive',
      organizationId: 'org',
      order: { ...order, revision: 8 },
      input: { ...input, quantity: '1.000000', clientOperationId: 'new-operation' },
    });
    expect(service.receiveOrder).toHaveBeenLastCalledWith('org', order, input);
    expect(store.command()).toBeNull();
  });
  it('does not inject a late accepted receipt into another tenant', () => {
    const accepted = new Subject<ProcurementReceiptOutput>();
    service.receiveOrder.mockReturnValue(accepted);
    store.execute({ kind: 'receive', organizationId: 'org', order, input });
    store.setScope('another');
    accepted.next(receipt);
    expect(dispatch).not.toHaveBeenCalled();
    expect(store.receiptEntities()).toEqual([]);
    expect(store.selectedOrder()).toBeNull();
    expect(store.commandCallState().status).toBe('idle');
    expect(store.commandCallState().data).toBeNull();
  });
  it('retains confirmed quota blocks as results and permits only an explicit new individualization attempt', () => {
    const hardware = {
      ...receipt,
      kind: 'equipment_to_individualize' as const,
      status: 'awaiting_individualization' as const,
      blockedReason: 'quota_exceeded',
    };
    service.individualizeReceipt.mockReturnValue(of(hardware));
    store.execute({
      kind: 'individualize',
      organizationId: 'org',
      receipt: hardware,
      input: { clientOperationId: 'attempt-1' },
    });
    expect(store.commandCallState().data).toMatchObject({
      blockedReason: 'quota_exceeded',
      equipmentIds: [],
    });
    expect(store.uncertainCommand()).toBe(false);
    expect(store.command()).toBeNull();
    store.execute({
      kind: 'individualize',
      organizationId: 'org',
      receipt: { ...hardware, revision: 3 },
      input: { clientOperationId: 'attempt-2' },
    });
    expect(service.individualizeReceipt).toHaveBeenLastCalledWith(
      'org',
      { ...hardware, revision: 3 },
      { clientOperationId: 'attempt-2' },
    );
  });
  it('keeps definitive revision errors available for review while allowing the unchanged draft to be edited', () => {
    service.receiveOrder.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 412,
            error: { title: 'Revision changed', detail: 'Review latest source order.' },
          }),
      ),
    );
    store.execute({ kind: 'receive', organizationId: 'org', order, input });
    expect(store.uncertainCommand()).toBe(false);
    expect(store.commandCallState().error?.message).toContain('Review latest source order.');
    store.clearCommand();
    expect(store.commandCallState().status).toBe('idle');
  });

  it('keeps pending physical returns visible and cancels an earlier receipt history read', () => {
    const stale = new Subject<HydraCollection<ProcurementReturnOutput>>();
    service.listReturns.mockReturnValueOnce(stale);
    store.loadReturns({ organizationId: 'org', receiptId: 'previous-receipt' });
    expect(store.returnsCallState().status).toBe('pending');
    store.loadReturns({ organizationId: 'org', receiptId: 'receipt', options: { page: 2 } });
    stale.next({ '@id': '/returns', '@type': 'Collection', member: [], totalItems: 90 });
    expect(store.supplyReturnEntities()).toEqual([returned]);
    expect(store.totalReturns()).toBe(1);
    expect(store.returnReceiptId()).toBe('receipt');
    expect(store.returnsCallState().status).toBe('success');
    expect(service.listReturns).toHaveBeenLastCalledWith('org', 'receipt', { page: 2 });
  });

  it('ignores a return history response after leaving and re-entering the same tenant', () => {
    const stale = new Subject<HydraCollection<ProcurementReturnOutput>>();
    service.listReturns.mockReturnValueOnce(stale);
    store.loadReturns({ organizationId: 'org', receiptId: 'receipt' });
    store.setScope('another');
    store.setScope('org');
    stale.next({ '@id': '/returns', '@type': 'Collection', member: [returned], totalItems: 1 });
    expect(store.supplyReturnEntities()).toEqual([]);
    expect(store.returnReceiptId()).toBeNull();
    expect(store.returnsCallState().status).toBe('idle');
  });

  it('retains a confirmed return shortage as a physical fact rather than a transport uncertainty', () => {
    const physicalReceipt = {
      ...receipt,
      returnedQuantity: '0.050000',
      pendingReturnQuantity: '0.050000',
      revision: 3,
    };
    service.returnReceipt.mockReturnValue(of(physicalReceipt));
    const returnInput = {
      quantity: returned.quantity,
      reason: returned.reason,
      clientOperationId: returned.clientOperationId,
    };
    store.execute({ kind: 'return', organizationId: 'org', receipt, input: returnInput });
    expect(store.commandCallState().status).toBe('success');
    expect(store.commandCallState().data).toEqual(physicalReceipt);
    expect(store.command()).toBeNull();
    expect(store.uncertainCommand()).toBe(false);
    expect(dispatch).toHaveBeenCalledOnce();
  });

  it('replays an uncertain reconciliation with the original revision and identical attempt UUID', () => {
    const reconciliation = { clientOperationId: '722df8a7-b9a6-4e19-a10a-6c52f2e7a01d' };
    service.reconcileReturn.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );
    store.execute({ kind: 'reconcile', organizationId: 'org', returned, input: reconciliation });
    expect(store.uncertainCommand()).toBe(true);
    expect(store.commandCallState().status).toBe('error');
    store.clearCommand();
    expect(store.command()).not.toBeNull();
    store.execute({
      kind: 'reconcile',
      organizationId: 'org',
      returned: { ...returned, revision: 5 },
      input: { clientOperationId: 'new-attempt' },
    });
    expect(service.reconcileReturn).toHaveBeenLastCalledWith('org', returned, reconciliation);
    expect(store.commandCallState().status).toBe('success');
    expect(store.commandCallState().data).toEqual(returned);
    expect(store.command()).toBeNull();
  });

  it('keeps one reconciliation running and excludes late completion from another tenant', () => {
    const accepted = new Subject<ProcurementReturnOutput>();
    service.reconcileReturn.mockReturnValue(accepted);
    const reconciliation = { clientOperationId: '722df8a7-b9a6-4e19-a10a-6c52f2e7a01d' };
    store.execute({ kind: 'reconcile', organizationId: 'org', returned, input: reconciliation });
    store.execute({ kind: 'reconcile', organizationId: 'org', returned, input: reconciliation });
    expect(service.reconcileReturn).toHaveBeenCalledOnce();
    expect(store.commandPending()).toBe(true);
    store.setScope('another');
    accepted.next({ ...returned, status: 'confirmed', revision: 5 });
    expect(dispatch).not.toHaveBeenCalled();
    expect(store.supplyReturnEntities()).toEqual([]);
    expect(store.returnReceiptId()).toBeNull();
    expect(store.commandCallState().status).toBe('idle');
    expect(store.commandCallState().data).toBeNull();
  });

  it('refreshes one receipt revision independently from the paginated history and cancels superseded reads', () => {
    const stale = new Subject<ProcurementReceiptOutput>();
    const latest = { ...receipt, revision: 3, returnedQuantity: '0.050000' };
    service.readReceipt.mockReturnValueOnce(stale).mockReturnValueOnce(of(latest));
    store.readReceipt({ organizationId: 'org', receiptId: 'previous-receipt' });
    expect(store.receiptCallState().status).toBe('pending');
    store.readReceipt({ organizationId: 'org', receiptId: 'receipt' });
    stale.next({ ...receipt, id: 'previous-receipt' });
    expect(store.receiptCallState().status).toBe('success');
    expect(store.receiptCallState().data).toEqual(latest);
    expect(store.receiptEntities()).toEqual([]);
    expect(service.readReceipt).toHaveBeenLastCalledWith('org', 'receipt');
  });

  it('refreshes the retained return revision without deriving it from the visible page', () => {
    const latest = { ...returned, revision: 5, status: 'confirmed' as const };
    service.readReturn.mockReturnValue(of(latest));
    store.readReturn({ organizationId: 'org', returnId: 'returned' });
    expect(store.returnCallState().status).toBe('success');
    expect(store.returnCallState().data).toEqual(latest);
    expect(store.supplyReturnEntities()).toEqual([]);
    expect(latest.clientOperationId).toBe(returned.clientOperationId);
    expect(latest.quantity).toBe(returned.quantity);
    expect(latest.reason).toBe(returned.reason);
    store.clearOrder();
    expect(store.receiptCallState().status).toBe('idle');
    expect(store.returnCallState().status).toBe('idle');
  });

  it('discards targeted receipt and return responses after a superseded organization visit', () => {
    const staleReceipt = new Subject<ProcurementReceiptOutput>();
    const staleReturn = new Subject<ProcurementReturnOutput>();
    service.readReceipt.mockReturnValue(staleReceipt);
    service.readReturn.mockReturnValue(staleReturn);
    store.readReceipt({ organizationId: 'org', receiptId: 'receipt' });
    store.readReturn({ organizationId: 'org', returnId: 'returned' });
    store.setScope('another');
    store.setScope('org');
    staleReceipt.next(receipt);
    staleReturn.next(returned);
    expect(store.receiptCallState().status).toBe('idle');
    expect(store.receiptCallState().data).toBeNull();
    expect(store.returnCallState().status).toBe('idle');
    expect(store.returnCallState().data).toBeNull();
  });
});
