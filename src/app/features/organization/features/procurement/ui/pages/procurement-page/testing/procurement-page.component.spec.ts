import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { Subject } from 'rxjs';
import {
  errorCallState,
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
    const catalog = {
      load: vi.fn(),
      clear: vi.fn(),
      options: signal<readonly { value: string; label: string }[]>([]),
    };
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

  it('creates a supplier and forwards later edits with the displayed source revision', async () => {
    const { page, store } = await setup();
    const input = {
      name: 'Reviewed supplier',
      code: null,
      contacts: [{ name: 'Mary', role: 'Parts' }],
    };
    page['openSupplier'](null);
    page['saveSupplier'](input);
    expect(store.execute).toHaveBeenCalledExactlyOnceWith({
      kind: 'create_supplier',
      organizationId: 'org',
      input,
    });
    store.execute.mockClear();
    page['openSupplier'](supplier);
    store.supplierCallState.set(successCallState({ ...supplier, revision: 3 }));
    page['saveSupplier'](input);
    expect(store.execute).toHaveBeenCalledExactlyOnceWith({
      kind: 'update_supplier',
      organizationId: 'org',
      supplier,
      input,
    });
    expect(page['editorTitle']()).toBe('Supplier information');
  });

  it('opens a new purchase with an active-only supplier picker and submits exact decimal strings', async () => {
    const { fixture, page, store, catalog } = await setup();
    page['pickerSearch'].set('previous');
    page['pickerPage'].set(4);
    page['openOrder'](null);
    await fixture.whenStable();
    expect(page['pickerSearch']()).toBe('');
    expect(page['pickerPage']()).toBe(1);
    expect(store.loadSuppliers).toHaveBeenLastCalledWith({
      organizationId: 'org',
      options: { page: 1, itemsPerPage: 30, search: '', params: { archived: false } },
    });
    expect(catalog.load).not.toHaveBeenCalled();
    page['ensureEquipmentTypes']();
    page['ensureEquipmentTypes']();
    expect(catalog.load).toHaveBeenCalledExactlyOnceWith('org');
    const input = {
      name: 'Stock replenishment',
      supplierId: supplier.id,
      lines: [{ kind: 'part' as const, partId: 'part', quantity: '0.000001' }],
    };
    page['saveOrder'](input);
    expect(store.execute).toHaveBeenCalledExactlyOnceWith({
      kind: 'create_order',
      organizationId: 'org',
      input,
    });
    expect(page['editorTitle']()).toBe('Purchase draft');
  });

  it('edits only a purchase draft and sends its original revision after a background refresh', async () => {
    const { page, store } = await setup();
    page['openOrder'](order);
    expect(page['editor']()).toBeNull();
    const draft = { ...order, status: 'draft' as const };
    page['openOrder'](draft);
    store.selectedOrder.set({ ...draft, revision: 8 });
    const input = {
      name: 'Reviewed draft',
      supplierId: supplier.id,
      lines: [
        { kind: 'part' as const, partId: 'part', quantity: '0.750000', unitCost: '0.000000' },
      ],
    };
    page['saveOrder'](input);
    expect(store.execute).toHaveBeenCalledExactlyOnceWith({
      kind: 'update_order',
      organizationId: 'org',
      order: draft,
      input,
    });
  });

  it('records a physical return with the retained receipt revision and validated UUID', async () => {
    const { page, store } = await setup();
    const input = {
      quantity: returned.quantity,
      reason: returned.reason,
      clientOperationId: returned.clientOperationId,
    };
    page['recordReturn'](input);
    expect(store.execute).not.toHaveBeenCalled();
    page['openReturn'](receipt);
    store.receiptCallState.set(successCallState({ ...receipt, revision: 4 }));
    page['recordReturn'](input);
    expect(store.execute).toHaveBeenCalledExactlyOnceWith({
      kind: 'return',
      organizationId: 'org',
      receipt,
      input,
    });
    expect(page['editorTitle']()).toBe('Record a physical return');
  });

  it('stops write intents when procurement management is unavailable', async () => {
    const { page, store } = await setup([ORGANIZATION_PERMISSION.PROCUREMENT_READ]);
    page['openSupplier'](null);
    page['openOrder'](null);
    page['openReturn'](receipt);
    page['saveSupplier']({ name: 'Unauthorized', contacts: [] });
    page['saveOrder']({ name: 'Unauthorized', supplierId: 'supplier', lines: [] });
    page['requestConfirmation']({ kind: 'archive_supplier', organizationId: 'org', supplier });
    expect(page['editor']()).toBeNull();
    expect(page['confirmation']()).toBeNull();
    expect(store.clearCommand).not.toHaveBeenCalled();
    expect(store.execute).not.toHaveBeenCalled();
  });

  it.each(['pending', 'uncertain'] as const)(
    'blocks edits, confirmation changes and source navigation during a %s write',
    async (state) => {
      const { page, store, navigate } = await setup();
      page['openReturn'](receipt);
      const command: ProcurementCommand = {
        kind: 'archive_supplier',
        organizationId: 'org',
        supplier,
      };
      page['requestConfirmation'](command);
      if (state === 'pending') store.commandPending.set(true);
      else store.uncertainCommand.set(true);
      page['openSupplier'](null);
      page['openOrder'](null);
      page['saveSupplier']({ name: 'Locked', contacts: [] });
      page['saveOrder']({ name: 'Locked', supplierId: 'supplier', lines: [] });
      page['recordReturn']({
        quantity: returned.quantity,
        reason: returned.reason,
        clientOperationId: returned.clientOperationId,
      });
      page['requestIndividualization'](receipt);
      page['requestReconciliation'](returned);
      page['confirmOperation']();
      page['confirmationStateChanged']('closed');
      page['sheetStateChanged']('closed');
      page['reviewLatest']();
      page['selectOrder'](order, true);
      page['clearSelection']();
      expect(page['editor']()).toBe('return');
      expect(page['confirmation']()).toEqual(command);
      expect(page['reviewRequested']()).toBe(false);
      expect(store.execute).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    },
  );

  it('requires equipment and inventory authority before opening their operation confirmations', async () => {
    const { page, store } = await setup([ORGANIZATION_PERMISSION.PROCUREMENT_MANAGE]);
    page['requestIndividualization'](receipt);
    page['requestReconciliation'](returned);
    expect(page['confirmation']()).toBeNull();
    expect(store.clearCommand).not.toHaveBeenCalled();
    page['confirmOperation']();
    page['retryCommand']();
    expect(store.execute).not.toHaveBeenCalled();
  });

  it('keeps source quantities and lifecycle authoritative for equipment and return operations', async () => {
    const { page, store, permissions } = await setup();
    const hardware = {
      ...receipt,
      kind: 'equipment_to_individualize' as const,
      status: 'awaiting_individualization' as const,
    };
    expect(page['canIndividualize'](hardware)).toBe(true);
    expect(page['canIndividualize']({ ...hardware, equipmentIds: ['equipment'] })).toBe(false);
    expect(page['canIndividualize']({ ...hardware, status: 'individualized' })).toBe(false);
    store.receiptsCallState.set(pendingCallState());
    expect(page['canIndividualize'](hardware)).toBe(false);
    expect(page['canReconcile']({ ...returned, status: 'confirmed' })).toBe(false);
    store.returnsCallState.set(pendingCallState());
    expect(page['canReconcile'](returned)).toBe(false);
    expect(page['canCancelOrder']({ ...order, status: 'received' })).toBe(false);
    expect(page['canCancelOrder']({ ...order, status: 'cancelled' })).toBe(false);
    expect(page['canCancelOrder']({ ...order, status: 'partial_received' })).toBe(true);
    expect(page['canEditOrder']({ ...order, status: 'draft' })).toBe(true);
    expect(page['canReceive']({ ...order, status: 'partial_received' }, stockLine)).toBe(true);
    expect(page['canReceive'](order, { ...stockLine, remainingQuantity: 'invalid' })).toBe(false);
    permissions.set(new Set([ORGANIZATION_PERMISSION.PROCUREMENT_MANAGE]));
    expect(page['canReturn'](hardware)).toBe(true);
    expect(page['canReturn']({ ...receipt, returnedQuantity: 'invalid' })).toBe(false);
  });

  it('merges source navigation into the route while resetting receipt history for a different order', async () => {
    const { page, navigate } = await setup();
    page['receiptPage'].set(3);
    page['returnsReceiptId'].set(receipt.id);
    page['selectOrder'](order, true);
    expect(page['receiptPage']()).toBe(1);
    expect(page['returnsReceiptId']()).toBeNull();
    expect(navigate).toHaveBeenLastCalledWith([], {
      queryParams: { orderId: 'order', section: 'receipts' },
      queryParamsHandling: 'merge',
    });
    page['selectOrder'](order);
    expect(navigate).toHaveBeenLastCalledWith([], {
      queryParams: { orderId: 'order', section: 'orders' },
      queryParamsHandling: 'merge',
    });
    page['clearSelection']();
    expect(navigate).toHaveBeenLastCalledWith([], {
      queryParams: { orderId: null },
      queryParamsHandling: 'merge',
    });
    page['selectSection']('suppliers');
    expect(navigate).toHaveBeenLastCalledWith([], {
      queryParams: { section: 'suppliers' },
      queryParamsHandling: 'merge',
    });
  });

  it('clears the previous organization editor and reloads catalogue labels only when the new source needs them', async () => {
    const { page, store, fixture, catalog } = await setup();
    const hardwareLine = {
      ...stockLine,
      kind: 'equipment_to_individualize' as const,
      typeCode: 'EXTINGUISHER',
    };
    store.selectedOrder.set({ ...order, lines: [hardwareLine] });
    await fixture.whenStable();
    expect(catalog.load).toHaveBeenCalledExactlyOnceWith('org');
    store.selectedOrder.set({ ...order, revision: 8, lines: [hardwareLine] });
    await fixture.whenStable();
    expect(catalog.load).toHaveBeenCalledOnce();
    page['openSupplier'](supplier);
    page['dirty'].set(true);
    page['requestConfirmation']({ kind: 'archive_supplier', organizationId: 'org', supplier });
    fixture.componentRef.setInput('organizationId', 'another');
    await fixture.whenStable();
    expect(store.setScope).toHaveBeenLastCalledWith('another');
    expect(page['editor']()).toBeNull();
    expect(page['confirmation']()).toBeNull();
    expect(page.hasUnsavedChanges()).toBe(false);
    expect(catalog.clear).toHaveBeenCalledTimes(2);
    expect(catalog.load).toHaveBeenLastCalledWith('another');
  });

  it.each(['create_order', 'update_order'] as const)(
    'selects the confirmed $kind result and refreshes the current server view',
    async (kind) => {
      const { page, store, savedEvents, navigate } = await setup();
      const input = { name: 'Saved purchase', supplierId: supplier.id, lines: [] };
      const command: ProcurementCommand =
        kind === 'create_order'
          ? { kind, organizationId: 'org', input }
          : { kind, organizationId: 'org', order, input };
      page['openOrder'](null);
      page['dirty'].set(true);
      store.loadOrders.mockClear();
      savedEvents.next(
        procurementStoreEvents.saved({
          organizationId: 'org',
          command,
          result: { ...order, id: 'saved-order' },
        }),
      );
      expect(navigate).toHaveBeenCalledExactlyOnceWith([], {
        queryParams: { orderId: 'saved-order', section: 'orders' },
        queryParamsHandling: 'merge',
      });
      expect(page['editor']()).toBeNull();
      expect(page.hasUnsavedChanges()).toBe(false);
      expect(store.loadOrders).toHaveBeenCalledExactlyOnceWith({
        organizationId: 'org',
        options: { page: 1, itemsPerPage: 30, params: {} },
      });
    },
  );

  it('renders historical equipment and stock references without inventing labels or units', async () => {
    const { page, catalog, store } = await setup();
    catalog.options.set([{ value: 'OLD_TYPE', label: 'Archived extinguisher' }]);
    const hardware = {
      ...stockLine,
      kind: 'equipment_to_individualize' as const,
      typeCode: 'OLD_TYPE',
      identityTemplate: { name: 'Reserve unit' },
    };
    expect(page['lineTitle'](hardware)).toBe('Reserve unit · Archived extinguisher');
    expect(page['lineTitle']({ ...hardware, identityTemplate: {}, typeCode: 'UNKNOWN_TYPE' })).toBe(
      'UNKNOWN_TYPE',
    );
    expect(page['lineTitle']({ ...hardware, identityTemplate: { name: 42 }, typeCode: null })).toBe(
      '',
    );
    expect(page['lineUnit'](hardware)).toBe('units');
    expect(page['lineTitle'](stockLine)).toBe('SEAL — Seal');
    expect(page['lineTitle']({ ...stockLine, partCode: null })).toBe('Seal');
    expect(page['lineTitle']({ ...stockLine, partLabel: null })).toBe(
      'Stock article label unavailable',
    );
    expect(page['lineUnit']({ ...stockLine, partUnit: null })).toBe('unit unavailable');
    expect(page['receiptUnit'](receipt)).toBe('piece');
    store.selectedOrder.set(null);
    expect(page['receiptUnit'](receipt)).toBe('');
    expect(page['blockedLabel']('insufficient_stock')).toBe(
      'The physical return is retained. Inventory needs reconciliation before its movement can be confirmed.',
    );
    expect(page['blockedLabel']('new_server_reason')).toBe('new server reason');
  });

  it('exposes definitive revision conflicts for explicit review and retains the normalized error message', async () => {
    const { page, store } = await setup();
    expect(page['commandError']()).toBeNull();
    expect(page['revisionConflict']()).toBe(false);
    for (const code of [409, 412, 503]) {
      store.commandCallState.set(
        errorCallState({
          error: null,
          code,
          message: 'Review displayed revision.',
          retryable: code === 503,
          timestamp: 0,
        }),
      );
      expect(page['commandError']()).toBe('Review displayed revision.');
      expect(page['revisionConflict']()).toBe(code !== 503);
    }
  });

  it('requests a discard for a dirty sheet and dismisses clean sheets and unaccepted confirmations', async () => {
    const { page } = await setup();
    page['openSupplier'](supplier);
    page['dirty'].set(true);
    page['sheetStateChanged']('closed');
    expect(page['discardState']()).toBe('open');
    expect(page['editor']()).toBe('supplier');
    page['resolveDiscard'](false);
    page['dirty'].set(false);
    page['sheetStateChanged']('closed');
    expect(page['editor']()).toBeNull();
    page['requestConfirmation']({ kind: 'archive_supplier', organizationId: 'org', supplier });
    page['confirmationStateChanged']('open');
    expect(page['confirmation']()?.kind).toBe('archive_supplier');
    page['confirmationStateChanged']('closed');
    expect(page['confirmation']()).toBeNull();
  });

  it.each([
    {
      kind: 'archive_supplier',
      title: 'Archive this supplier?',
      description:
        'The supplier remains in existing purchases and history. New orders require an active supplier.',
    },
    {
      kind: 'place_order',
      title: 'Place this purchase order?',
      description: 'The draft becomes an order. Physical deliveries will be recorded separately.',
    },
    {
      kind: 'cancel_remaining',
      title: 'Cancel undelivered quantities?',
      description:
        'Only quantities still awaiting delivery are cancelled. Previous receipts and returns remain retained.',
    },
    {
      kind: 'individualize',
      title: 'Create reserve equipment for this receipt?',
      description:
        'The server creates a bounded set of individually identified reserve equipment. A quota or unavailable type keeps the physical receipt awaiting action.',
    },
    {
      kind: 'reconcile',
      title: 'Reconcile this physical return?',
      description:
        'The server tries to confirm the inventory reversal. The original physical quantity and reason stay unchanged if stock is still insufficient.',
    },
  ] as const)(
    'requires an explicit confirmation explaining the $kind operation',
    async ({ kind, title, description }) => {
      const { page, store } = await setup();
      const hardware = {
        ...receipt,
        kind: 'equipment_to_individualize' as const,
        status: 'awaiting_individualization' as const,
      };
      if (kind === 'individualize') page['requestIndividualization'](hardware);
      else if (kind === 'reconcile') page['requestReconciliation'](returned);
      else
        page['requestConfirmation'](
          kind === 'archive_supplier'
            ? { kind, organizationId: 'org', supplier }
            : { kind, organizationId: 'org', order },
        );
      const command = page['confirmation']();
      expect(command?.kind).toBe(kind);
      if (command?.kind === 'individualize') {
        expect(command.receipt).toEqual(hardware);
        expect(command.input.clientOperationId).toMatch(
          /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/,
        );
      }
      if (command?.kind === 'reconcile') {
        expect(command.returned).toEqual(returned);
        expect(command.input.clientOperationId).toMatch(
          /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/,
        );
      }
      expect(page['confirmationTitle']()).toBe(title);
      expect(page['confirmationDescription']()).toBe(description);
      expect(store.execute).not.toHaveBeenCalled();
      page['confirmOperation']();
      expect(store.execute).toHaveBeenCalledExactlyOnceWith(command);
    },
  );

  it('forwards server filters and pagination to orders and expanded receipt history on refresh', async () => {
    const { page, store, fixture } = await setup();
    page['orderStatus'].set('partial_received');
    page['orderPage'].set(3);
    page['receiptPage'].set(2);
    page['showReturns'](receipt);
    page['returnPage'].set(2);
    store.totalSuppliers.set(0);
    store.totalOrders.set(61);
    store.totalReceipts.set(31);
    store.totalReturns.set(60);
    await fixture.whenStable();
    expect(page['supplierPageCount']()).toBe(1);
    expect(page['orderPageCount']()).toBe(3);
    expect(page['receiptPageCount']()).toBe(2);
    expect(page['returnPageCount']()).toBe(2);
    page['reload']();
    expect(store.loadOrders).toHaveBeenLastCalledWith({
      organizationId: 'org',
      options: { page: 3, itemsPerPage: 30, params: { status: 'partial_received' } },
    });
    expect(store.loadReceipts).toHaveBeenLastCalledWith({
      organizationId: 'org',
      orderId: 'order',
      options: { page: 2, itemsPerPage: 30 },
    });
    expect(store.loadReturns).toHaveBeenLastCalledWith({
      organizationId: 'org',
      receiptId: receipt.id,
      options: { page: 2, itemsPerPage: 30 },
    });
  });
});
