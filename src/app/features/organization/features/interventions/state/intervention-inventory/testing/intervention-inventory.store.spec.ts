import { DOCUMENT, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConnectivityService } from '@core/connectivity';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionInventoryScope,
  InterventionInventorySnapshot,
  InterventionOutboxOperation,
  InterventionOutboxOperationFor,
} from '@features/organization/features/interventions/models';
import { InterventionInventoryService } from '@features/organization/features/interventions/services/intervention-inventory';
import type {
  DeclareInventoryConsumptionInput,
  InventoryConsumptionOutput,
} from '@features/organization/features/inventory/models';
import { InterventionInventoryStore } from '../intervention-inventory.store';

const scope: InterventionInventoryScope = {
  organizationId: 'org-1',
  interventionId: 'intervention-1',
  accountId: 'account-1',
  sessionRevision: 1,
};
const consumption: DeclareInventoryConsumptionInput = {
  clientOperationId: '11111111-1111-4111-8111-111111111111',
  interventionId: scope.interventionId,
  partId: 'part-1',
  warehouseId: 'warehouse-1',
  quantity: '2.000000',
  workItemId: 'work-item-1',
  equipmentId: 'equipment-1',
  occurredAt: '2026-10-06T10:00:00.123Z',
};
const receipt: InventoryConsumptionOutput = {
  '@id': '/api/organizations/org-1/inventory-consumptions/receipt-1',
  '@type': 'InventoryConsumption',
  id: 'receipt-1',
  partId: consumption.partId,
  warehouseId: consumption.warehouseId,
  quantity: consumption.quantity,
  interventionId: consumption.interventionId,
  workItemId: consumption.workItemId,
  equipmentId: consumption.equipmentId,
  actorId: scope.accountId,
  occurredAt: consumption.occurredAt,
  status: 'received_pending',
  reason: 'insufficient_stock',
  late: false,
  replayed: false,
};
const snapshot: InterventionInventorySnapshot = {
  version: 1,
  accountId: scope.accountId,
  organizationId: scope.organizationId,
  interventionId: scope.interventionId,
  capturedAt: '2026-10-06T10:00:00.123Z',
  catalogComplete: true,
  declarationsComplete: true,
  parts: [
    {
      '@id': '/api/organizations/org-1/inventory-parts/part-1',
      '@type': 'InventoryPart',
      id: 'part-1',
      code: 'SEAL',
      label: 'Safety seal',
      unit: 'piece',
      kind: 'part',
      archived: false,
    },
  ],
  warehouses: [
    {
      '@id': '/api/organizations/org-1/inventory-warehouses/warehouse-1',
      '@type': 'InventoryWarehouse',
      id: 'warehouse-1',
      code: 'VAN',
      name: 'Technician van',
      archived: false,
    },
  ],
  declarations: [receipt],
};
const queued: InterventionOutboxOperationFor<'inventory-consumption.declare'> = {
  id: `inventory:${consumption.clientOperationId}`,
  interventionId: consumption.interventionId,
  type: 'inventory-consumption.declare',
  payload: { ...consumption, actorId: scope.accountId, clientId: consumption.clientOperationId },
  createdAt: consumption.occurredAt,
  status: 'pending',
  error: null,
};
const flush = (): Promise<void> =>
  Array.from({ length: 16 }).reduce<Promise<void>>(
    (pending) => pending.then(() => undefined),
    Promise.resolve(),
  );

describe('InterventionInventoryStore', () => {
  let store: InstanceType<typeof InterventionInventoryStore>;
  const activeScope = signal<InterventionInventoryScope>(scope);
  const canRead = signal(true);
  const canConsume = signal(true);
  const disconnected = signal(true);
  const inventory = {
    isCurrent: vi.fn<(captured: InterventionInventoryScope, consume?: boolean) => boolean>(),
    loadSaved:
      vi.fn<
        (captured: InterventionInventoryScope) => Promise<InterventionInventorySnapshot | null>
      >(),
    refresh:
      vi.fn<(captured: InterventionInventoryScope) => Promise<InterventionInventorySnapshot>>(),
  };
  const offline = {
    listOutbox:
      vi.fn<(interventionId: string) => Promise<readonly InterventionOutboxOperation[]>>(),
    queueInventoryConsumption:
      vi.fn<
        (
          organizationId: string,
          input: DeclareInventoryConsumptionInput,
          accountId: string,
          current: () => boolean,
        ) => Promise<void>
      >(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
    activeScope.set(scope);
    canRead.set(true);
    canConsume.set(true);
    disconnected.set(true);
    inventory.isCurrent.mockImplementation(
      (captured, consume = false) =>
        canRead() &&
        (!consume || canConsume()) &&
        captured.organizationId === activeScope().organizationId &&
        captured.interventionId === activeScope().interventionId &&
        captured.accountId === activeScope().accountId &&
        captured.sessionRevision === activeScope().sessionRevision,
    );
    inventory.loadSaved.mockResolvedValue(snapshot);
    inventory.refresh.mockResolvedValue(snapshot);
    offline.listOutbox.mockResolvedValue([]);
    offline.queueInventoryConsumption.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        InterventionInventoryStore,
        { provide: InterventionInventoryService, useValue: inventory },
        { provide: InterventionOfflineService, useValue: offline },
        { provide: ConnectivityService, useValue: { isOffline: disconnected } },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    store = TestBed.inject(InterventionInventoryStore);
  });

  it('acknowledges a physical declaration only after the durable queue promise resolves', async () => {
    store.load(scope);
    await flush();
    let release: (() => void) | undefined;
    offline.queueInventoryConsumption.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    store.declare({ scope, input: consumption });
    expect(store.queueCallState().status).toBe('pending');
    expect(store.acceptedOperationId()).toBeNull();
    expect(store.unpersistedInput()).toEqual(consumption);
    expect(store.hasUnpersistedDeclaration()).toBe(true);
    expect(offline.queueInventoryConsumption).toHaveBeenCalledExactlyOnceWith(
      'org-1',
      consumption,
      'account-1',
      expect.any(Function),
    );
    expect(offline.queueInventoryConsumption.mock.calls[0]?.[3]()).toBe(true);

    offline.listOutbox.mockResolvedValue([queued]);
    release?.();
    await flush();
    expect(store.queueCallState().status).toBe('success');
    expect(store.acceptedOperationId()).toBe(consumption.clientOperationId);
    expect(store.unpersistedInput()).toBeNull();
    expect(store.hasUnpersistedDeclaration()).toBe(false);
    expect(store.localIntents()).toEqual([{ input: consumption, status: 'queued', error: null }]);
  });

  it('retains a volatile declaration after quota failure and retries its unchanged UUID and timestamp', async () => {
    store.load(scope);
    await flush();
    offline.queueInventoryConsumption.mockRejectedValueOnce(
      new DOMException('Storage full.', 'QuotaExceededError'),
    );
    store.declare({ scope, input: consumption });
    await flush();
    expect(store.queueCallState().status).toBe('error');
    expect(store.acceptedOperationId()).toBeNull();
    expect(store.unpersistedInput()).toEqual(consumption);
    expect(store.hasUnpersistedDeclaration()).toBe(true);
    expect(store.localIntents()).toEqual([]);

    offline.listOutbox.mockResolvedValue([queued]);
    const retry = store.unpersistedInput();
    if (!retry) throw new Error('Failed physical declaration must remain available for retry.');
    store.declare({ scope, input: retry });
    await flush();
    expect(offline.queueInventoryConsumption.mock.calls.map((call) => call.slice(0, 3))).toEqual([
      ['org-1', consumption, 'account-1'],
      ['org-1', consumption, 'account-1'],
    ]);
    expect(store.acceptedOperationId()).toBe(consumption.clientOperationId);
    expect(store.hasUnpersistedDeclaration()).toBe(false);
  });

  it('prevents browser unload while a submitted declaration remains volatile and releases it after persistence', async () => {
    const view = TestBed.inject(DOCUMENT).defaultView;
    if (!view) throw new Error('Browser test requires a window.');
    store.load(scope);
    await flush();
    offline.queueInventoryConsumption.mockRejectedValueOnce(new Error('Storage full.'));
    store.declare({ scope, input: consumption });
    await flush();
    TestBed.tick();
    const blocked = new Event('beforeunload', { cancelable: true });
    expect(view.dispatchEvent(blocked)).toBe(false);
    expect(blocked.defaultPrevented).toBe(true);

    store.declare({ scope, input: consumption });
    await flush();
    TestBed.tick();
    const permitted = new Event('beforeunload', { cancelable: true });
    expect(view.dispatchEvent(permitted)).toBe(true);
    expect(permitted.defaultPrevented).toBe(false);
  });

  it('keeps the durable acknowledgement even when refreshing the local queue later fails', async () => {
    store.load(scope);
    await flush();
    offline.listOutbox.mockRejectedValueOnce(new Error('Local queue could not be read.'));
    store.declare({ scope, input: consumption });
    await flush();
    expect(store.acceptedOperationId()).toBe(consumption.clientOperationId);
    expect(store.unpersistedInput()).toBeNull();
    expect(store.queueCallState().status).toBe('success');
    expect(store.readCallState().status).toBe('error');
  });

  it.each(['account', 'organization', 'intervention', 'session', 'permission'] as const)(
    'suppresses a late queue acknowledgement after the %s changes',
    async (change) => {
      store.load(scope);
      await flush();
      let release: (() => void) | undefined;
      offline.queueInventoryConsumption.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            release = resolve;
          }),
      );
      store.declare({ scope, input: consumption });
      if (change === 'account') activeScope.set({ ...scope, accountId: 'account-2' });
      if (change === 'organization') activeScope.set({ ...scope, organizationId: 'org-2' });
      if (change === 'intervention')
        activeScope.set({ ...scope, interventionId: 'intervention-2' });
      if (change === 'session') activeScope.set({ ...scope, sessionRevision: 2 });
      if (change === 'permission') canRead.set(false);
      expect(offline.queueInventoryConsumption.mock.calls[0]?.[3]()).toBe(false);
      store.load(null);
      release?.();
      await flush();
      expect(store.scope()).toBeNull();
      expect(store.acceptedOperationId()).toBeNull();
      expect(store.localIntents()).toEqual([]);
      expect(store.entities()).toEqual([]);
      expect(store.queueCallState().status).toBe('idle');
    },
  );

  it.each([
    'incomplete',
    'archived part',
    'archived warehouse',
    'unknown part',
    'wrong intervention',
    'denied execution',
  ] as const)('does not queue a declaration with %s eligibility', async (reason) => {
    if (reason === 'incomplete')
      inventory.loadSaved.mockResolvedValue({ ...snapshot, catalogComplete: false });
    if (reason === 'archived part')
      inventory.loadSaved.mockResolvedValue({
        ...snapshot,
        parts: snapshot.parts.map((part) => ({ ...part, archived: true })),
      });
    if (reason === 'archived warehouse')
      inventory.loadSaved.mockResolvedValue({
        ...snapshot,
        warehouses: snapshot.warehouses.map((warehouse) => ({ ...warehouse, archived: true })),
      });
    store.load(scope);
    await flush();
    if (reason === 'denied execution') canConsume.set(false);
    const input =
      reason === 'unknown part'
        ? { ...consumption, partId: 'unknown-part' }
        : reason === 'wrong intervention'
          ? { ...consumption, interventionId: 'intervention-2' }
          : consumption;
    store.declare({ scope, input });
    await flush();
    expect(offline.queueInventoryConsumption).not.toHaveBeenCalled();
    expect(store.acceptedOperationId()).toBeNull();
    expect(store.hasUnpersistedDeclaration()).toBe(false);
  });

  it('restores a complete device catalog and this actor’s queued or failed declarations while offline', async () => {
    const failed = {
      ...queued,
      id: 'inventory:failed',
      status: 'failed' as const,
      error: 'Reference requires review.',
      payload: { ...queued.payload, clientOperationId: 'failed-uuid' },
    };
    offline.listOutbox.mockResolvedValue([
      queued,
      failed,
      {
        ...queued,
        id: 'inventory:other-actor',
        payload: { ...queued.payload, actorId: 'account-2' },
      },
      {
        id: 'comment',
        interventionId: scope.interventionId,
        type: 'comment.create',
        payload: { body: 'A comment' },
        createdAt: consumption.occurredAt,
        status: 'pending',
      },
    ]);
    store.load(scope);
    await flush();
    expect(store.catalogReady()).toBe(true);
    expect(store.fromDevice()).toBe(true);
    expect(store.readCallState().status).toBe('success');
    expect(inventory.refresh).not.toHaveBeenCalled();
    expect(store.localIntents()).toEqual([
      { input: consumption, status: 'queued', error: null },
      {
        input: { ...consumption, clientOperationId: 'failed-uuid' },
        status: 'failed',
        error: 'Reference requires review.',
      },
    ]);
    expect(store.entities()).toEqual([receipt]);
    expect(store.unresolvedCount()).toBe(1);
    expect(store.entities()[0]?.status).toBe('received_pending');
  });

  it('exposes a receipt-only snapshot without declaring its offline catalog usable', async () => {
    inventory.loadSaved.mockResolvedValue({
      ...snapshot,
      catalogComplete: false,
      declarationsComplete: false,
      parts: [],
      warehouses: [],
    });
    store.load(scope);
    await flush();
    expect(store.catalogReady()).toBe(false);
    expect(store.entities()).toEqual([receipt]);
    expect(store.unresolvedCount()).toBe(1);
  });

  it('retains a saved complete snapshot when the online refresh fails', async () => {
    disconnected.set(false);
    inventory.refresh.mockRejectedValueOnce(new Error('Inventory API unavailable.'));
    store.load(scope);
    await flush();
    expect(store.readCallState().status).toBe('error');
    expect(store.snapshot()).toEqual(snapshot);
    expect(store.entities()).toEqual([receipt]);
    expect(store.catalogReady()).toBe(true);
    expect(store.fromDevice()).toBe(true);
  });

  it('does not expose a late saved snapshot after the workspace has been cleared', async () => {
    let release: ((saved: InterventionInventorySnapshot) => void) | undefined;
    inventory.loadSaved.mockImplementation(
      () =>
        new Promise<InterventionInventorySnapshot>((resolve) => {
          release = resolve;
        }),
    );
    store.load(scope);
    expect(store.readCallState().status).toBe('pending');
    store.load(null);
    release?.(snapshot);
    await flush();
    expect(store.scope()).toBeNull();
    expect(store.snapshot()).toBeNull();
    expect(store.entities()).toEqual([]);
    expect(offline.listOutbox).not.toHaveBeenCalled();
    expect(inventory.refresh).not.toHaveBeenCalled();
  });

  it('does not expose a late network catalog after the permission is revoked', async () => {
    disconnected.set(false);
    let release: ((saved: InterventionInventorySnapshot) => void) | undefined;
    inventory.refresh.mockImplementation(
      () =>
        new Promise<InterventionInventorySnapshot>((resolve) => {
          release = resolve;
        }),
    );
    store.load(scope);
    await flush();
    expect(inventory.refresh).toHaveBeenCalledOnce();
    canRead.set(false);
    store.load(scope);
    release?.(snapshot);
    await flush();
    expect(store.scope()).toBeNull();
    expect(store.snapshot()).toBeNull();
    expect(store.entities()).toEqual([]);
  });
});
