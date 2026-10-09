import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { idleCallState } from '@core/request-state';
import { ProcurementService } from '@features/organization/features/procurement/data-access';
import type {
  SupplierOutput,
  PurchaseOrderOutput,
  ProcurementReceiptOutput,
  ProcurementReturnOutput,
  ReceivePurchaseOrderInput,
  CreateSupplierInput,
  CreatePurchaseOrderInput,
} from '@features/organization/features/procurement/models';
import { procurementStoreEvents } from '../events/events';
import type { ProcurementCommand } from '../models/procurement-command.type';
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
    createOrder: ReturnType<typeof vi.fn>;
    readSupplier: ReturnType<typeof vi.fn>;
    updateSupplier: ReturnType<typeof vi.fn>;
    archiveSupplier: ReturnType<typeof vi.fn>;
    updateOrder: ReturnType<typeof vi.fn>;
    placeOrder: ReturnType<typeof vi.fn>;
    cancelRemaining: ReturnType<typeof vi.fn>;
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
      createOrder: vi.fn().mockReturnValue(of(order)),
      readSupplier: vi.fn().mockReturnValue(of(supplier)),
      updateSupplier: vi.fn().mockReturnValue(of(supplier)),
      archiveSupplier: vi.fn().mockReturnValue(of(supplier)),
      updateOrder: vi.fn().mockReturnValue(of(order)),
      placeOrder: vi.fn().mockReturnValue(of(order)),
      cancelRemaining: vi.fn().mockReturnValue(of(order)),
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
  const creationCases = [
    {
      name: 'supplier',
      method: 'createSupplier',
      makeCommand: (name: string): ProcurementCommand => ({
        kind: 'create_supplier',
        organizationId: 'org',
        input: { name, contacts: [{ name: 'Mary', role: 'Parts' }] },
      }),
      result: supplier,
    },
    {
      name: 'purchase draft',
      method: 'createOrder',
      makeCommand: (name: string): ProcurementCommand => ({
        kind: 'create_order',
        organizationId: 'org',
        input: {
          name,
          supplierId: 'supplier',
          lines: [{ kind: 'part', partId: 'part', quantity: '0.250000' }],
        },
      }),
      result: order,
    },
  ] as const;

  it.each(creationCases)(
    'replays the original $name creation UUID and payload after a lost response',
    ({ method, makeCommand }) => {
      service[method].mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));
      store.execute(makeCommand('Original draft'));
      const firstInput = service[method].mock.calls[0][1] as
        | CreateSupplierInput
        | CreatePurchaseOrderInput;
      expect(firstInput.clientOperationId).toMatch(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
      expect(store.uncertainCommand()).toBe(true);
      store.clearCommand();
      store.execute(makeCommand('Edited draft'));
      expect(service[method]).toHaveBeenLastCalledWith('org', firstInput);
      expect(store.command()).toBeNull();
      expect(store.commandCallState().status).toBe('success');
      expect(dispatch).toHaveBeenCalledOnce();
    },
  );

  it.each(creationCases)(
    'retains the $name creation UUID after an unchanged rejected draft and replaces it on an edit',
    ({ method, makeCommand }) => {
      service[method]
        .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 400 })))
        .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 400 })));
      store.execute(makeCommand('Original draft'));
      const firstInput = service[method].mock.calls[0][1] as
        | CreateSupplierInput
        | CreatePurchaseOrderInput;
      store.execute(makeCommand('Original draft'));
      expect(service[method]).toHaveBeenLastCalledWith('org', firstInput);
      store.execute(makeCommand('Edited draft'));
      const changedInput = service[method].mock.calls[2][1] as
        | CreateSupplierInput
        | CreatePurchaseOrderInput;
      expect(changedInput.name).toBe('Edited draft');
      expect(changedInput.clientOperationId).not.toBe(firstInput.clientOperationId);
    },
  );

  it.each(creationCases)(
    'starts an identical new $name creation with a fresh UUID after success',
    ({ method, makeCommand }) => {
      store.execute(makeCommand('Original draft'));
      const firstInput = service[method].mock.calls[0][1] as
        | CreateSupplierInput
        | CreatePurchaseOrderInput;
      expect(store.command()).toBeNull();
      store.execute(makeCommand('Original draft'));
      const nextInput = service[method].mock.calls[1][1] as
        | CreateSupplierInput
        | CreatePurchaseOrderInput;
      expect(nextInput.clientOperationId).not.toBe(firstInput.clientOperationId);
      expect(dispatch).toHaveBeenCalledTimes(2);
    },
  );

  it.each(creationCases)(
    'clears a definitively rejected $name creation before starting a new attempt',
    ({ method, makeCommand }) => {
      service[method].mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 400 })));
      store.execute(makeCommand('Original draft'));
      const firstInput = service[method].mock.calls[0][1] as
        | CreateSupplierInput
        | CreatePurchaseOrderInput;
      store.clearCommand();
      expect(store.command()).toBeNull();
      expect(store.commandCallState().status).toBe('idle');
      store.execute(makeCommand('Original draft'));
      const nextInput = service[method].mock.calls[1][1] as
        | CreateSupplierInput
        | CreatePurchaseOrderInput;
      expect(nextInput.clientOperationId).not.toBe(firstInput.clientOperationId);
    },
  );

  it.each(creationCases)(
    'keeps only one accepted $name creation running and excludes its late result from another scope',
    ({ method, makeCommand, result }) => {
      const accepted = new Subject<SupplierOutput | PurchaseOrderOutput>();
      service[method].mockReturnValue(accepted);
      store.execute(makeCommand('Original draft'));
      store.execute(makeCommand('Edited draft'));
      expect(service[method]).toHaveBeenCalledOnce();
      expect(store.commandPending()).toBe(true);
      store.setScope('another');
      accepted.next(result);
      expect(dispatch).not.toHaveBeenCalled();
      expect(store.command()).toBeNull();
      expect(store.commandCallState().status).toBe('idle');
      expect(store.commandCallState().data).toBeNull();
    },
  );

  it('snapshots supplier contacts before a lost response', () => {
    const contacts = [{ name: 'Mary', role: 'Parts' }];
    service.createSupplier.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );
    store.execute({
      kind: 'create_supplier',
      organizationId: 'org',
      input: { name: 'Fire supplies', contacts },
    });
    contacts[0].name = 'Changed after submission';
    store.execute({
      kind: 'create_supplier',
      organizationId: 'org',
      input: { contacts, name: 'Fire supplies' },
    });
    expect(service.createSupplier).toHaveBeenLastCalledWith('org', {
      name: 'Fire supplies',
      contacts: [{ name: 'Mary', role: 'Parts' }],
      clientOperationId: expect.any(String),
    });
  });

  it('snapshots purchase lines and nested equipment identity before a lost response', () => {
    const identityTemplate = { manufacturer: { name: 'Original' } };
    const lines = [
      { kind: 'equipment_to_individualize' as const, quantity: '2.000000', identityTemplate },
    ];
    service.createOrder.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));
    store.execute({
      kind: 'create_order',
      organizationId: 'org',
      input: { name: 'Reserve equipment', supplierId: 'supplier', lines },
    });
    lines[0].quantity = '3.000000';
    identityTemplate.manufacturer.name = 'Changed after submission';
    store.execute({
      kind: 'create_order',
      organizationId: 'org',
      input: { name: 'Reserve equipment', supplierId: 'supplier', lines },
    });
    expect(service.createOrder).toHaveBeenLastCalledWith('org', {
      name: 'Reserve equipment',
      supplierId: 'supplier',
      lines: [
        {
          kind: 'equipment_to_individualize',
          quantity: '2.000000',
          identityTemplate: { manufacturer: { name: 'Original' } },
        },
      ],
      clientOperationId: expect.any(String),
    });
  });

  it('compares creation payloads independently from property order and a proposed operation UUID', () => {
    service.createSupplier.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 400 })),
    );
    store.execute({
      kind: 'create_supplier',
      organizationId: 'org',
      input: { name: 'Fire supplies', contacts: [{ name: 'Mary', role: 'Parts' }] },
    });
    const firstInput = service.createSupplier.mock.calls[0][1] as CreateSupplierInput;
    store.execute({
      kind: 'create_supplier',
      organizationId: 'org',
      input: {
        contacts: [{ role: 'Parts', name: 'Mary' }],
        name: 'Fire supplies',
        clientOperationId: '5e8c271b-79e0-4a66-9396-b3e9324d79ec',
      },
    });
    expect(service.createSupplier).toHaveBeenLastCalledWith('org', firstInput);
  });

  it('starts a fresh purchase creation operation when a rejected nested identity field changes', () => {
    service.createOrder.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 400 })),
    );
    const draft: CreatePurchaseOrderInput = {
      name: 'Reserve equipment',
      supplierId: 'supplier',
      lines: [
        {
          kind: 'equipment_to_individualize',
          quantity: '2.000000',
          identityTemplate: { manufacturer: { name: 'Original' } },
        },
      ],
    };
    store.execute({ kind: 'create_order', organizationId: 'org', input: draft });
    const firstInput = service.createOrder.mock.calls[0][1] as CreatePurchaseOrderInput;
    store.execute({
      kind: 'create_order',
      organizationId: 'org',
      input: {
        ...draft,
        lines: draft.lines.map((line) =>
          Object.assign({}, line, { identityTemplate: { manufacturer: { name: 'Changed' } } }),
        ),
      },
    });
    const nextInput = service.createOrder.mock.calls[1][1] as CreatePurchaseOrderInput;
    expect(nextInput.clientOperationId).not.toBe(firstInput.clientOperationId);
    expect(nextInput.lines[0].identityTemplate).toEqual({ manufacturer: { name: 'Changed' } });
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

  const readCases = [
    { method: 'listSuppliers', action: 'loadSuppliers', state: 'suppliersCallState', source: {} },
    {
      method: 'readSupplier',
      action: 'readSupplier',
      state: 'supplierCallState',
      source: { supplierId: 'supplier' },
    },
    { method: 'listOrders', action: 'loadOrders', state: 'ordersCallState', source: {} },
    {
      method: 'readOrder',
      action: 'readOrder',
      state: 'orderCallState',
      source: { orderId: 'order' },
    },
    {
      method: 'listReceipts',
      action: 'loadReceipts',
      state: 'receiptsCallState',
      source: { orderId: 'order' },
    },
    {
      method: 'readReceipt',
      action: 'readReceipt',
      state: 'receiptCallState',
      source: { receiptId: 'receipt' },
    },
    {
      method: 'listReturns',
      action: 'loadReturns',
      state: 'returnsCallState',
      source: { receiptId: 'receipt' },
    },
    {
      method: 'readReturn',
      action: 'readReturn',
      state: 'returnCallState',
      source: { returnId: 'returned' },
    },
  ] as const;

  it.each(readCases)(
    'normalizes $action failures and permits an explicit retry',
    ({ method, action, state, source }) => {
      const response = new Subject<never>();
      service[method].mockReturnValueOnce(response);
      const request = {
        organizationId: 'org',
        supplierId: 'supplier',
        orderId: 'order',
        receiptId: 'receipt',
        returnId: 'returned',
        ...source,
      };
      store[action](request);
      expect(store[state]().status).toBe('pending');
      const error = new HttpErrorResponse({
        status: 403,
        error: { detail: 'Procurement access denied.' },
      });
      response.error(error);
      expect(store[state]()).toEqual({
        status: 'error',
        data: null,
        error: {
          error,
          code: 403,
          message: 'Procurement access denied.',
          retryable: false,
          timestamp: expect.any(Number),
        },
      });
      store[action](request);
      expect(store[state]().status).toBe('success');
      expect(service[method]).toHaveBeenCalledTimes(2);
      expect(dispatch).not.toHaveBeenCalled();
    },
  );

  it.each(readCases)(
    'ignores foreign scope $action requests and late errors from a previous visit',
    ({ method, action, state, source }) => {
      const request = {
        supplierId: 'supplier',
        orderId: 'order',
        receiptId: 'receipt',
        returnId: 'returned',
        ...source,
      };
      store[action]({ organizationId: 'another', ...request });
      expect(service[method]).not.toHaveBeenCalled();
      expect(store[state]()).toEqual(idleCallState());
      const previous = new Subject<never>();
      service[method].mockReturnValueOnce(previous);
      store[action]({ organizationId: 'org', ...request });
      store.setScope('another');
      store.setScope('org');
      previous.error(new HttpErrorResponse({ status: 503 }));
      expect(store[state]()).toEqual(idleCallState());
      expect(dispatch).not.toHaveBeenCalled();
    },
  );

  it('reads an archived supplier label independently from the active supplier picker', () => {
    const archived = { ...supplier, archivedAt: '2026-10-06T10:00:00Z', revision: 4 };
    const superseded = new Subject<SupplierOutput>();
    service.listSuppliers.mockReturnValue(of({ member: [], totalItems: 0 }));
    service.readSupplier.mockReturnValueOnce(superseded).mockReturnValueOnce(of(archived));
    store.loadSuppliers({ organizationId: 'org', options: { params: { archived: false } } });
    store.readSupplier({ organizationId: 'org', supplierId: 'other' });
    expect(store.supplierCallState().status).toBe('pending');
    store.readSupplier({ organizationId: 'org', supplierId: 'supplier' });
    superseded.next({ ...supplier, id: 'other' });
    expect(store.supplierEntities()).toEqual([]);
    expect(store.supplierCallState()).toEqual({ status: 'success', data: archived, error: null });
    expect(service.readSupplier).toHaveBeenLastCalledWith('org', 'supplier');
  });

  it('preserves the displayed order revision while its refresh is pending or fails', () => {
    store.readOrder({ organizationId: 'org', orderId: order.id });
    const refresh = new Subject<PurchaseOrderOutput>();
    service.readOrder.mockReturnValueOnce(refresh);
    store.readOrder({ organizationId: 'org', orderId: order.id });
    expect(store.orderCallState()).toEqual({ status: 'pending', data: order, error: null });
    refresh.error(
      new HttpErrorResponse({ status: 503, error: { detail: 'Source is unavailable.' } }),
    );
    expect(store.selectedOrder()).toEqual(order);
    expect(store.orderCallState().status).toBe('error');
    expect(store.orderCallState().error).toMatchObject({
      code: 503,
      retryable: true,
      message: 'Source is unavailable.',
    });
  });

  it('keeps server order totals while excluding a superseded page response', () => {
    const stale = new Subject<HydraCollection<PurchaseOrderOutput>>();
    service.listOrders
      .mockReturnValueOnce(stale)
      .mockReturnValueOnce(of({ member: [order], totalItems: 61 }));
    store.loadOrders({ organizationId: 'org', options: { page: 1 } });
    expect(store.ordersCallState().status).toBe('pending');
    store.loadOrders({
      organizationId: 'org',
      options: { page: 3, params: { status: 'ordered' } },
    });
    stale.next({ '@id': '/orders', '@type': 'Collection', member: [], totalItems: 0 });
    expect(store.orderEntities()).toEqual([order]);
    expect(store.totalOrders()).toBe(61);
    expect(store.ordersCallState().status).toBe('success');
    expect(service.listOrders).toHaveBeenLastCalledWith('org', {
      page: 3,
      params: { status: 'ordered' },
    });
  });

  it('clears the previous source receipts during a new order read and retains server pagination', () => {
    store.loadReceipts({ organizationId: 'org', orderId: 'order' });
    const response = new Subject<HydraCollection<ProcurementReceiptOutput>>();
    service.listReceipts.mockReturnValueOnce(response);
    store.loadReceipts({ organizationId: 'org', orderId: 'next', options: { page: 2 } });
    expect(store.receiptEntities()).toEqual([]);
    expect(store.receiptOrderId()).toBe('next');
    expect(store.receiptsCallState().status).toBe('pending');
    const nextReceipt = { ...receipt, id: 'next-receipt', orderId: 'next' };
    response.next({
      '@id': '/receipts',
      '@type': 'Collection',
      member: [nextReceipt],
      totalItems: 31,
    });
    response.complete();
    expect(store.receiptEntities()).toEqual([nextReceipt]);
    expect(store.totalReceipts()).toBe(31);
    expect(service.listReceipts).toHaveBeenLastCalledWith('org', 'next', { page: 2 });
    store.loadReceipts({ organizationId: 'org', orderId: 'next', options: { page: 1 } });
    expect(store.receiptEntities()).toEqual([receipt]);
  });

  const lifecycleCases = [
    {
      method: 'updateSupplier',
      command: {
        kind: 'update_supplier',
        organizationId: 'org',
        supplier,
        input: { name: 'Updated supplier', code: null, contacts: [{ name: 'Mary' }] },
      },
      args: [
        'org',
        supplier,
        { name: 'Updated supplier', code: null, contacts: [{ name: 'Mary' }] },
      ],
      result: { ...supplier, revision: 4 },
    },
    {
      method: 'archiveSupplier',
      command: { kind: 'archive_supplier', organizationId: 'org', supplier },
      args: ['org', supplier],
      result: { ...supplier, revision: 4, archivedAt: '2026-10-06T10:00:00Z' },
    },
    {
      method: 'updateOrder',
      command: {
        kind: 'update_order',
        organizationId: 'org',
        order: { ...order, status: 'draft' },
        input: {
          name: 'Updated purchase',
          supplierId: supplier.id,
          lines: [{ kind: 'part', partId: 'part', quantity: '0.250000' }],
        },
      },
      args: [
        'org',
        { ...order, status: 'draft' },
        {
          name: 'Updated purchase',
          supplierId: supplier.id,
          lines: [{ kind: 'part', partId: 'part', quantity: '0.250000' }],
        },
      ],
      result: { ...order, revision: 8 },
    },
    {
      method: 'placeOrder',
      command: { kind: 'place_order', organizationId: 'org', order: { ...order, status: 'draft' } },
      args: ['org', { ...order, status: 'draft' }],
      result: { ...order, revision: 8 },
    },
    {
      method: 'cancelRemaining',
      command: { kind: 'cancel_remaining', organizationId: 'org', order },
      args: ['org', order],
      result: { ...order, status: 'cancelled', revision: 8 },
    },
  ] as const satisfies readonly {
    method: keyof typeof service;
    command: ProcurementCommand;
    args: readonly unknown[];
    result: SupplierOutput | PurchaseOrderOutput;
  }[];

  it.each(lifecycleCases)(
    'sends the displayed revision for $method and dispatches only its confirmed result',
    ({ method, command, args, result }) => {
      const accepted = new Subject<SupplierOutput | PurchaseOrderOutput>();
      service[method].mockReturnValueOnce(accepted);
      store.execute(command);
      expect(service[method]).toHaveBeenCalledExactlyOnceWith(...args);
      expect(store.command()).toEqual(command);
      expect(store.commandCallState()).toEqual({ status: 'pending', data: null, error: null });
      store.clearCommand();
      expect(store.command()).toEqual(command);
      expect(dispatch).not.toHaveBeenCalled();
      accepted.next(result);
      accepted.complete();
      expect(store.commandCallState()).toEqual({ status: 'success', data: result, error: null });
      expect(store.command()).toBeNull();
      expect(dispatch).toHaveBeenCalledExactlyOnceWith(
        procurementStoreEvents.saved({ organizationId: 'org', command, result }),
      );
    },
  );

  it('retains the original update payload and revision after a retryable server failure', () => {
    const command: ProcurementCommand = {
      kind: 'update_supplier',
      organizationId: 'org',
      supplier,
      input: { name: 'Reviewed name', contacts: [] },
    };
    service.updateSupplier.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 503 })),
    );
    store.execute(command);
    expect(store.uncertainCommand()).toBe(true);
    expect(store.commandCallState().error?.code).toBe(503);
    store.execute({
      ...command,
      supplier: { ...supplier, revision: 9 },
      input: { name: 'Edited later', contacts: [] },
    });
    expect(service.updateSupplier).toHaveBeenLastCalledWith('org', supplier, command.input);
    expect(dispatch).toHaveBeenCalledExactlyOnceWith(
      procurementStoreEvents.saved({ organizationId: 'org', command, result: supplier }),
    );
  });

  it.each(['pending', 'uncertain'] as const)(
    'retains the physical source when clearing a %s write',
    (state) => {
      store.readOrder({ organizationId: 'org', orderId: 'order' });
      store.loadReceipts({ organizationId: 'org', orderId: 'order' });
      service.receiveOrder.mockReturnValueOnce(
        state === 'pending'
          ? new Subject<ProcurementReceiptOutput>()
          : throwError(() => new HttpErrorResponse({ status: 0 })),
      );
      store.execute({ kind: 'receive', organizationId: 'org', order, input });
      store.clearOrder();
      expect(store.selectedOrder()).toEqual(order);
      expect(store.receiptEntities()).toEqual([receipt]);
      expect(store.receiptOrderId()).toBe('order');
    },
  );

  it('excludes a source response that arrives after its order selection was cleared', () => {
    const response = new Subject<PurchaseOrderOutput>();
    service.readOrder.mockReturnValueOnce(response);
    store.readOrder({ organizationId: 'org', orderId: 'order' });
    store.clearOrder();
    response.next(order);
    response.complete();
    expect(store.selectedOrder()).toBeNull();
    expect(store.orderCallState()).toEqual(idleCallState());
  });

  it('retains a physical receipt UUID and payload for recovery after a retryable server failure', () => {
    const accepted = new Subject<ProcurementReceiptOutput>();
    service.receiveOrder.mockReturnValueOnce(accepted);
    const original: ProcurementCommand = { kind: 'receive', organizationId: 'org', order, input };
    store.execute(original);
    accepted.error(
      new HttpErrorResponse({
        status: 503,
        error: { detail: 'Original organization service failed.' },
      }),
    );
    expect(store.uncertainCommand()).toBe(true);
    expect(store.command()).toEqual(original);
    store.clearCommand();
    expect(store.command()).toEqual(original);
    expect(dispatch).not.toHaveBeenCalled();
    store.execute({
      ...original,
      order: { ...order, revision: 8 },
      input: {
        ...input,
        quantity: '1.000000',
        clientOperationId: '98cc99ec-bee2-4871-8cb7-93f62e7d0e83',
      },
    });
    expect(service.receiveOrder).toHaveBeenLastCalledWith('org', order, input);
    expect(store.commandCallState().status).toBe('success');
    expect(dispatch).toHaveBeenCalledExactlyOnceWith(
      procurementStoreEvents.saved({ organizationId: 'org', command: original, result: receipt }),
    );
  });
});
