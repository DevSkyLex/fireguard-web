import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { Subject } from 'rxjs';
import {
  idleCallState,
  pendingCallState,
  successCallState,
  type CallState,
} from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { EquipmentTypeCatalogStore } from '@features/organization/features/equipments';
import type {
  ProcurementReceiptOutput,
  ProcurementReturnOutput,
  PurchaseOrderLineOutput,
  PurchaseOrderOutput,
  ReceivePurchaseOrderInput,
  SupplierOutput,
} from '@features/organization/features/procurement/models';
import {
  ProcurementStore,
  procurementStoreEvents,
} from '@features/organization/features/procurement/state';
import type {
  ProcurementCommand,
  ProcurementMutationOutput,
} from '@features/organization/features/procurement/state/procurement/models/procurement-command.type';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { ProcurementPage } from '../procurement-page.component';

describe('ProcurementPage', () => {
  const stockLine: PurchaseOrderLineOutput = {
    id: 'line',
    kind: 'part',
    partId: 'part',
    quantity: '1.000000',
    receivedQuantity: '0.250000',
    returnedQuantity: '0.000000',
    remainingQuantity: '0.750000',
    identityTemplate: {},
    partCode: 'SEAL',
    partLabel: 'Seal',
    partUnit: 'piece',
  };
  const order: PurchaseOrderOutput = {
    '@id': '/orders/order',
    '@type': 'PurchaseOrder',
    id: 'order',
    organizationId: 'org',
    supplierId: 'supplier',
    name: 'Fire supplies',
    currency: 'EUR',
    status: 'ordered',
    lines: [stockLine],
    financialVisible: false,
    revision: 7,
    createdAt: '2026-10-05T10:00:00Z',
    updatedAt: '2026-10-05T10:00:00Z',
    replayed: false,
  };
  const receipt: ProcurementReceiptOutput = {
    '@id': '/receipts/receipt',
    '@type': 'ProcurementReceipt',
    id: 'receipt',
    organizationId: 'org',
    orderId: 'order',
    lineId: 'line',
    kind: 'part',
    quantity: '0.250000',
    returnedQuantity: '0.050000',
    pendingReturnQuantity: '0.050000',
    warehouseId: 'warehouse',
    currency: 'EUR',
    receivedAt: '2026-10-05T10:00:00Z',
    createdAt: '2026-10-05T10:00:00Z',
    equipmentIds: [],
    status: 'stock_received',
    revision: 3,
    financialVisible: false,
    replayed: false,
  };
  const returned: ProcurementReturnOutput = {
    '@id': '/returns/returned',
    '@type': 'ProcurementReturn',
    id: 'returned',
    organizationId: 'org',
    receiptId: 'receipt',
    clientOperationId: '1ce5e2b5-dbbb-4b41-a1a0-c681df34e143',
    quantity: '0.050000',
    reason: 'Damaged packaging',
    status: 'awaiting_reconciliation',
    createdAt: '2026-10-05T10:00:00Z',
    revision: 4,
    replayed: false,
  };
  const supplier: SupplierOutput = {
    '@id': '/suppliers/supplier',
    '@type': 'Supplier',
    id: 'supplier',
    organizationId: 'org',
    name: 'Fire supplies',
    contacts: [],
    revision: 2,
    createdAt: '2026-10-05T10:00:00Z',
    updatedAt: '2026-10-05T10:00:00Z',
    replayed: false,
  };
  const receiptInput: ReceivePurchaseOrderInput = {
    lineId: 'line',
    warehouseId: 'warehouse',
    quantity: '0.250000',
    receivedAt: '2026-10-05T12:00:00+02:00',
    clientOperationId: 'fd8ef21f-cc2f-4bc5-a3c3-d958188dd72a',
  };

  async function setup(
    initialPermissions: readonly string[] = [
      ORGANIZATION_PERMISSION.PROCUREMENT_MANAGE,
      ORGANIZATION_PERMISSION.INVENTORY_MANAGE,
      ORGANIZATION_PERMISSION.EQUIPMENT_WRITE,
    ],
    platformId: 'browser' | 'server' = 'browser',
  ) {
    const permissions = signal<ReadonlySet<string>>(new Set(initialPermissions));
    const store = {
      setScope: vi.fn(),
      clearOrder: vi.fn(),
      clearCommand: vi.fn(),
      loadSuppliers: vi.fn(),
      loadOrders: vi.fn(),
      loadReceipts: vi.fn(),
      loadReturns: vi.fn(),
      readSupplier: vi.fn(),
      readOrder: vi.fn(),
      readReceipt: vi.fn(),
      readReturn: vi.fn(),
      execute: vi.fn(),
      commandPending: signal(false),
      uncertainCommand: signal(false),
      command: signal<ProcurementCommand | null>(null),
      commandCallState: signal<CallState<ProcurementMutationOutput>>(idleCallState()),
      orderCallState: signal<CallState<PurchaseOrderOutput>>(successCallState(order)),
      supplierCallState: signal<CallState<SupplierOutput>>(idleCallState()),
      receiptCallState: signal<CallState<ProcurementReceiptOutput>>(idleCallState()),
      returnCallState: signal<CallState<ProcurementReturnOutput>>(idleCallState()),
      selectedOrder: signal<PurchaseOrderOutput | null>(order),
      receiptsCallState: signal<CallState>(successCallState(null)),
      returnsCallState: signal<CallState>(successCallState(null)),
      receiptEntityMap: signal<Readonly<Record<string, ProcurementReceiptOutput>>>({}),
      supplyReturnEntityMap: signal<Readonly<Record<string, ProcurementReturnOutput>>>({}),
      totalSuppliers: signal(0),
      totalOrders: signal(0),
      totalReceipts: signal(0),
      totalReturns: signal(0),
    };
    const catalog = { load: vi.fn(), clear: vi.fn(), options: signal([]) };
    const navigate = vi.fn().mockResolvedValue(true);
    const savedEvents = new Subject<ReturnType<typeof procurementStoreEvents.saved>>();
    TestBed.configureTestingModule({
      imports: [ProcurementPage],
      providers: [
        { provide: PLATFORM_ID, useValue: platformId },
        { provide: ProcurementStore, useValue: store },
        { provide: Router, useValue: { navigate } },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: (permission: string) => permissions().has(permission) },
        },
        {
          provide: REGIONAL_FORMATTING_PORT,
          useValue: { regionalFormatting: signal({ dateFormat: 'yyyy-MM-dd', timezone: 'UTC' }) },
        },
        { provide: Events, useValue: { on: () => savedEvents } },
      ],
    }).overrideComponent(ProcurementPage, {
      set: { template: '', providers: [{ provide: EquipmentTypeCatalogStore, useValue: catalog }] },
    });
    const fixture = TestBed.createComponent(ProcurementPage);
    fixture.componentRef.setInput('organizationId', 'org');
    fixture.componentRef.setInput('section', 'receipts');
    fixture.componentRef.setInput('orderId', 'order');
    fixture.detectChanges();
    await fixture.whenStable();
    return {
      fixture,
      page: fixture.componentInstance,
      store,
      catalog,
      permissions,
      navigate,
      savedEvents,
    };
  }

  it('does not load authenticated procurement or catalogue data while rendered on the server', async () => {
    const { store, catalog } = await setup([ORGANIZATION_PERMISSION.PROCUREMENT_MANAGE], 'server');
    expect(store.setScope).not.toHaveBeenCalled();
    expect(store.loadOrders).not.toHaveBeenCalled();
    expect(store.readOrder).not.toHaveBeenCalled();
    expect(store.loadReceipts).not.toHaveBeenCalled();
    expect(store.loadSuppliers).not.toHaveBeenCalled();
    expect(store.readSupplier).not.toHaveBeenCalled();
    expect(store.loadReturns).not.toHaveBeenCalled();
    expect(catalog.load).not.toHaveBeenCalled();
  });

  it('sends all suppliers explicitly and preserves that scope on refresh', async () => {
    const { fixture, page, store } = await setup([ORGANIZATION_PERMISSION.PROCUREMENT_READ]);
    fixture.componentRef.setInput('section', 'suppliers');
    fixture.componentRef.setInput('orderId', undefined);
    await fixture.whenStable();
    page['supplierFilter'].set('all');
    await fixture.whenStable();
    expect(store.loadSuppliers).toHaveBeenLastCalledWith({
      organizationId: 'org',
      options: { page: 1, itemsPerPage: 30, search: '', params: { archived: 'all' } },
    });
    page['reload']();
    expect(store.loadSuppliers).toHaveBeenLastCalledWith({
      organizationId: 'org',
      options: { page: 1, itemsPerPage: 30, search: '', params: { archived: 'all' } },
    });
    page['supplierFilter'].set('archived');
    await fixture.whenStable();
    expect(store.loadSuppliers.mock.lastCall?.[0].options.params).toEqual({ archived: true });
  });

  it('forwards the route organization and physical source to browser-only server reads', async () => {
    const { store, catalog } = await setup();
    expect(store.setScope).toHaveBeenCalledWith('org');
    expect(store.readOrder).toHaveBeenCalledWith({ organizationId: 'org', orderId: 'order' });
    expect(store.loadReceipts).toHaveBeenCalledWith({
      organizationId: 'org',
      orderId: 'order',
      options: { page: 1, itemsPerPage: 30 },
    });
    expect(store.loadReturns).not.toHaveBeenCalled();
    expect(catalog.load).not.toHaveBeenCalled();
  });

  it('requires independent financial read and manage permissions before editing costs', async () => {
    const { page, permissions } = await setup([ORGANIZATION_PERMISSION.PROCUREMENT_MANAGE]);
    expect(page['canReadCosts']()).toBe(false);
    expect(page['canEditCosts']()).toBe(false);
    permissions.set(new Set([ORGANIZATION_PERMISSION.MAINTENANCE_COST_MANAGE]));
    expect(page['canReadCosts']()).toBe(false);
    expect(page['canEditCosts']()).toBe(false);
    permissions.set(new Set([ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ]));
    expect(page['canReadCosts']()).toBe(true);
    expect(page['canEditCosts']()).toBe(false);
    permissions.set(
      new Set([
        ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ,
        ORGANIZATION_PERMISSION.MAINTENANCE_COST_MANAGE,
      ]),
    );
    expect(page['canEditCosts']()).toBe(true);
    expect(page['canManage']()).toBe(false);
  });

  it('requires Inventory management for stock receipts and Equipment write for explicit individualization', async () => {
    const { page, permissions } = await setup([ORGANIZATION_PERMISSION.PROCUREMENT_MANAGE]);
    const hardwareLine: PurchaseOrderLineOutput = {
      ...stockLine,
      kind: 'equipment_to_individualize',
      partId: null,
      typeCode: 'EXTINGUISHER',
    };
    const hardwareReceipt: ProcurementReceiptOutput = {
      ...receipt,
      kind: 'equipment_to_individualize',
      status: 'awaiting_individualization',
    };
    expect(page['canReceive'](order, stockLine)).toBe(false);
    expect(page['canReceive'](order, hardwareLine)).toBe(true);
    expect(page['canIndividualize'](hardwareReceipt)).toBe(false);
    permissions.set(
      new Set([
        ORGANIZATION_PERMISSION.PROCUREMENT_MANAGE,
        ORGANIZATION_PERMISSION.EQUIPMENT_WRITE,
      ]),
    );
    expect(page['canIndividualize'](hardwareReceipt)).toBe(true);
    permissions.set(
      new Set([
        ORGANIZATION_PERMISSION.PROCUREMENT_MANAGE,
        ORGANIZATION_PERMISSION.INVENTORY_MANAGE,
      ]),
    );
    expect(page['canReceive'](order, stockLine)).toBe(true);
    expect(page['canIndividualize'](hardwareReceipt)).toBe(false);
    expect(page['canReconcile'](returned)).toBe(true);
  });

  it('rejects unavailable or exhausted physical sources while the displayed authority is loading', async () => {
    const { page, store } = await setup();
    expect(page['canReceive']({ ...order, id: 'another' }, stockLine)).toBe(false);
    expect(page['canReceive'](order, { ...stockLine, remainingQuantity: '0.000000' })).toBe(false);
    expect(page['canReceive']({ ...order, status: 'cancelled' }, stockLine)).toBe(false);
    store.orderCallState.set(pendingCallState(order));
    expect(page['canReceive'](order, stockLine)).toBe(false);
    expect(page['canEditOrder']({ ...order, status: 'draft' })).toBe(false);
    expect(page['canCancelOrder'](order)).toBe(false);
    page['openReceipt'](order, stockLine);
    expect(page['editor']()).toBeNull();
    expect(store.execute).not.toHaveBeenCalled();
  });

  it.each(['pending', 'uncertain'])(
    'locks navigation and dismissal during a %s operation',
    async (state) => {
      const { page, store, navigate } = await setup();
      page['openSupplier'](supplier);
      if (state === 'pending') store.commandPending.set(true);
      else store.uncertainCommand.set(true);
      page['requestClose']();
      page['selectSection']('orders');
      page['openReceipt'](order, stockLine);
      expect(page['editor']()).toBe('supplier');
      expect(navigate).not.toHaveBeenCalled();
      expect(page.hasUnsavedChanges()).toBe(true);
      await expect(page.confirmDeactivation()).resolves.toBe(false);
    },
  );

  it('sends the displayed original order revision until the reader explicitly reviews a newer source', async () => {
    const { page, store } = await setup();
    page['openReceipt'](order, stockLine);
    store.selectedOrder.set({ ...order, revision: 8 });
    store.orderCallState.set(successCallState({ ...order, revision: 8 }));
    page['recordReceipt'](receiptInput);
    expect(store.execute).toHaveBeenCalledExactlyOnceWith({
      kind: 'receive',
      organizationId: 'org',
      order,
      input: receiptInput,
    });
    expect(page['receivingLine']()).toEqual(stockLine);
  });

  it('adopts a source revision only after explicit review finishes while retaining the physical draft', async () => {
    const { page, store } = await setup();
    const latest = {
      ...order,
      revision: 8,
      lines: [{ ...stockLine, remainingQuantity: '0.500000' }],
    };
    page['openReceipt'](order, stockLine);
    page['dirty'].set(true);
    store.selectedOrder.set(latest);
    page['adoptLatestRevision']();
    expect(page['editingOrder']()).toEqual(order);
    page['reviewLatest']();
    store.orderCallState.set(pendingCallState(order));
    expect(page['reviewReady']()).toBe(false);
    page['adoptLatestRevision']();
    expect(page['editingOrder']()).toEqual(order);
    store.orderCallState.set(successCallState(latest));
    expect(page['reviewReady']()).toBe(true);
    page['adoptLatestRevision']();
    expect(page['editingOrder']()).toEqual(latest);
    expect(page['receivingLine']()).toEqual(latest.lines[0]);
    expect(page['dirty']()).toBe(true);
    page['recordReceipt'](receiptInput);
    expect(store.execute).toHaveBeenLastCalledWith({
      kind: 'receive',
      organizationId: 'org',
      order: latest,
      input: receiptInput,
    });
  });

  it('reviews a reconciliation source directly and preserves the attempt UUID while adopting its revision', async () => {
    const { page, store } = await setup();
    page['requestReconciliation'](returned);
    const original = page['confirmation']();
    page['reviewLatest']();
    expect(store.readReturn).toHaveBeenCalledExactlyOnceWith({
      organizationId: 'org',
      returnId: 'returned',
    });
    store.returnCallState.set(pendingCallState(returned));
    expect(page['reviewReady']()).toBe(false);
    store.returnCallState.set(successCallState({ ...returned, id: 'unrelated-return' }));
    expect(page['reviewReady']()).toBe(false);
    const latest = { ...returned, revision: 5 };
    store.returnCallState.set(successCallState(latest));
    expect(page['reviewReady']()).toBe(true);
    page['adoptLatestRevision']();
    expect(page['confirmation']()).toEqual({ ...original, returned: latest });
    expect(page['confirmation']()).toMatchObject({
      returned: {
        quantity: returned.quantity,
        reason: returned.reason,
        clientOperationId: returned.clientOperationId,
      },
    });
    expect(store.clearCommand).toHaveBeenCalled();
  });

  it('adopts a reviewed supplier in its editor without discarding the draft', async () => {
    const { page, store } = await setup();
    page['openSupplier'](supplier);
    page['dirty'].set(true);
    page['reviewLatest']();
    const latest = { ...supplier, revision: 3 };
    store.supplierCallState.set(successCallState(latest));
    page['adoptLatestRevision']();
    expect(page['editingSupplier']()).toEqual(latest);
    expect(page['dirty']()).toBe(true);
    expect(page['reviewRequested']()).toBe(false);
  });

  it('adopts a reviewed purchase draft only for the matching editor source', async () => {
    const { page, store } = await setup();
    const draft = { ...order, status: 'draft' as const };
    store.selectedOrder.set(draft);
    store.orderCallState.set(successCallState(draft));
    page['openOrder'](draft);
    page['dirty'].set(true);
    page['reviewLatest']();
    const unrelated = { ...draft, id: 'unrelated', revision: 8 };
    store.selectedOrder.set(unrelated);
    store.orderCallState.set(successCallState(unrelated));
    page['adoptLatestRevision']();
    expect(page['editingOrder']()).toEqual(draft);
    const latest = { ...draft, revision: 8 };
    store.selectedOrder.set(latest);
    store.orderCallState.set(successCallState(latest));
    page['adoptLatestRevision']();
    expect(page['editingOrder']()).toEqual(latest);
    expect(page['dirty']()).toBe(true);
  });

  it('retains a physical receiving source if its line disappeared during revision review', async () => {
    const { page, store } = await setup();
    page['openReceipt'](order, stockLine);
    page['reviewLatest']();
    const latest = { ...order, revision: 8, lines: [] };
    store.selectedOrder.set(latest);
    store.orderCallState.set(successCallState(latest));
    page['adoptLatestRevision']();
    expect(page['editingOrder']()).toEqual(order);
    expect(page['receivingLine']()).toEqual(stockLine);
  });

  it('adopts a reviewed return receipt while retaining the physical return draft', async () => {
    const { page, store } = await setup();
    page['openReturn'](receipt);
    page['dirty'].set(true);
    page['reviewLatest']();
    const latest = { ...receipt, revision: 4 };
    store.receiptCallState.set(successCallState(latest));
    page['adoptLatestRevision']();
    expect(page['returningReceipt']()).toEqual(latest);
    expect(page['dirty']()).toBe(true);
  });

  it('updates an archive confirmation to its explicitly reviewed supplier revision', async () => {
    const { page, store } = await setup();
    const command: ProcurementCommand = {
      kind: 'archive_supplier',
      organizationId: 'org',
      supplier,
    };
    page['requestConfirmation'](command);
    page['reviewLatest']();
    const latest = { ...supplier, revision: 3 };
    store.supplierCallState.set(successCallState(latest));
    page['adoptLatestRevision']();
    expect(page['confirmation']()).toEqual({ ...command, supplier: latest });
  });

  it.each(['place_order', 'cancel_remaining'] as const)(
    'updates a %s confirmation to its explicitly reviewed order revision',
    async (kind) => {
      const { page, store } = await setup();
      const command: ProcurementCommand = { kind, organizationId: 'org', order };
      page['requestConfirmation'](command);
      page['reviewLatest']();
      const latest = { ...order, revision: 8 };
      store.selectedOrder.set(latest);
      store.orderCallState.set(successCallState(latest));
      page['adoptLatestRevision']();
      expect(page['confirmation']()).toEqual({ ...command, order: latest });
    },
  );

  it('preserves an individualization operation UUID when its receipt revision is reviewed', async () => {
    const { page, store } = await setup();
    page['requestIndividualization'](receipt);
    const original = page['confirmation']();
    page['reviewLatest']();
    const latest = { ...receipt, revision: 4 };
    store.receiptCallState.set(successCallState(latest));
    page['adoptLatestRevision']();
    expect(page['confirmation']()).toEqual({ ...original, receipt: latest });
    expect(page['confirmation']()).toMatchObject({
      input: { clientOperationId: expect.any(String) },
    });
    expect(store.execute).not.toHaveBeenCalled();
  });

  it('keeps returned physical quantities authoritative and excludes individualized equipment returns', async () => {
    const { page, permissions } = await setup();
    expect(page['canReturn'](receipt)).toBe(true);
    expect(page['canReturn']({ ...receipt, returnedQuantity: receipt.quantity })).toBe(false);
    expect(page['canReturn']({ ...receipt, equipmentIds: ['equipment'] })).toBe(false);
    permissions.set(new Set([ORGANIZATION_PERMISSION.PROCUREMENT_MANAGE]));
    expect(page['canReturn'](receipt)).toBe(false);
  });

  it('requires confirmation for a reconciliation and keeps transport retry on the retained UUID', async () => {
    const { page, store } = await setup();
    page['requestReconciliation'](returned);
    const command = page['confirmation']();
    expect(command).toMatchObject({ kind: 'reconcile', organizationId: 'org', returned });
    expect(store.execute).not.toHaveBeenCalled();
    page['confirmOperation']();
    expect(store.execute).toHaveBeenCalledExactlyOnceWith(command);
    store.command.set(command);
    store.uncertainCommand.set(true);
    page['retryCommand']();
    expect(store.execute).toHaveBeenLastCalledWith(command);
    store.commandPending.set(true);
    page['retryCommand']();
    expect(store.execute).toHaveBeenCalledTimes(2);
  });

  it('loads return history only for the explicitly opened physical receipt', async () => {
    const { page, store, fixture } = await setup();
    page['returnPage'].set(3);
    page['showReturns'](receipt);
    await fixture.whenStable();
    expect(store.loadReturns).toHaveBeenCalledExactlyOnceWith({
      organizationId: 'org',
      receiptId: 'receipt',
      options: { page: 1, itemsPerPage: 30 },
    });
    expect(page.orderId()).toBe('order');
    page['showReturns'](receipt);
    await fixture.whenStable();
    expect(page['returnsReceiptId']()).toBeNull();
    expect(store.loadReturns).toHaveBeenCalledOnce();
  });

  it('keeps a dirty editor after foreign events and closes only after a confirmed same-organization result', async () => {
    const { page, savedEvents } = await setup();
    page['openSupplier'](supplier);
    page['dirty'].set(true);
    savedEvents.next(
      procurementStoreEvents.saved({
        organizationId: 'another',
        command: {
          kind: 'create_supplier',
          organizationId: 'another',
          input: { name: 'Foreign', contacts: [] },
        },
        result: { ...supplier, organizationId: 'another' },
      }),
    );
    expect(page['editor']()).toBe('supplier');
    expect(page.hasUnsavedChanges()).toBe(true);
    savedEvents.next(
      procurementStoreEvents.saved({
        organizationId: 'org',
        command: {
          kind: 'update_supplier',
          organizationId: 'org',
          supplier,
          input: { name: 'Reviewed', contacts: [] },
        },
        result: supplier,
      }),
    );
    expect(page['editor']()).toBeNull();
    expect(page.hasUnsavedChanges()).toBe(false);
  });

  it('preserves a declined discard and resolves explicit navigation confirmation once', async () => {
    const { page } = await setup();
    page['openSupplier'](supplier);
    page['dirty'].set(true);
    const declined = page.confirmDeactivation();
    page['resolveDiscard'](false);
    await expect(declined).resolves.toBe(false);
    expect(page['editor']()).toBe('supplier');
    expect(page.hasUnsavedChanges()).toBe(true);
    const accepted = page.confirmDeactivation();
    page['resolveDiscard'](true);
    await expect(accepted).resolves.toBe(true);
    expect(page['editor']()).toBeNull();
    expect(page.hasUnsavedChanges()).toBe(false);
  });

  it.each(['clean', 'dirty', 'pending', 'uncertain'] as const)(
    'cancels browser unloading only when the workspace is %s and unresolved',
    async (state) => {
      const { page, store } = await setup();
      page['dirty'].set(state === 'dirty');
      store.commandPending.set(state === 'pending');
      store.uncertainCommand.set(state === 'uncertain');
      const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
      page['beforeUnload'](event);
      expect(event.defaultPrevented).toBe(state !== 'clean');
    },
  );
});
