import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import {
  InventoryService,
  InventoryCommandRepository,
} from '@features/organization/features/inventory/data-access';
import type {
  InventoryPartOutput,
  InventoryWarehouseOutput,
  InventoryBalanceOutput,
  InventoryMovementOutput,
  InventoryConsumptionOutput,
  InventoryPhysicalCommand,
} from '@features/organization/features/inventory/models';
import { InventoryStore } from '../inventory.store';

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('InventoryStore', () => {
  const part: InventoryPartOutput = {
    '@id': '/part',
    '@type': 'InventoryPart',
    id: 'part',
    code: 'SEAL',
    label: 'Seal',
    unit: 'piece',
    kind: 'part',
    archived: true,
  };
  const warehouse: InventoryWarehouseOutput = {
    '@id': '/warehouse',
    '@type': 'InventoryWarehouse',
    id: 'warehouse',
    code: 'VAN',
    name: 'Van',
    archived: true,
  };
  const balance: InventoryBalanceOutput = {
    '@id': '/balance',
    '@type': 'InventoryBalance',
    id: 'balance',
    partId: 'part',
    warehouseId: 'warehouse',
    quantity: '999999999999999999.123456',
  };
  const movement: InventoryMovementOutput = {
    '@id': '/movement',
    '@type': 'InventoryMovement',
    id: 'movement',
    partId: 'part',
    warehouseId: 'warehouse',
    kind: 'correction',
    quantity: '-1.000001',
    reason: 'Physical count',
    actorId: 'actor',
    occurredAt: '2026-10-06T12:00:00Z',
    late: false,
    replayed: false,
  };
  const consumption: InventoryConsumptionOutput = {
    '@id': '/consumption',
    '@type': 'InventoryConsumption',
    id: 'consumption',
    partId: 'part',
    warehouseId: 'warehouse',
    quantity: '3.000000',
    interventionId: 'intervention',
    actorId: 'actor',
    occurredAt: '2026-10-06T12:00:00Z',
    status: 'received_pending',
    reason: 'insufficient_stock',
    late: false,
    replayed: false,
  };
  const physical: InventoryPhysicalCommand = {
    kind: 'correction',
    organizationId: 'org',
    userId: 'user',
    input: {
      clientOperationId: 'stable',
      partId: 'part',
      warehouseId: 'warehouse',
      quantity: '-1.000001',
      reason: 'Physical count',
    },
  };
  function setup() {
    let revision = 1;
    const service = {
      listParts: vi.fn().mockReturnValue(of({ member: [part], totalItems: 41 })),
      listWarehouses: vi.fn().mockReturnValue(of({ member: [warehouse], totalItems: 1 })),
      listBalances: vi.fn().mockReturnValue(of({ member: [balance], totalItems: 1 })),
      listMovements: vi.fn().mockReturnValue(of({ member: [movement], totalItems: 1 })),
      listConsumptions: vi.fn().mockReturnValue(of({ member: [consumption], totalItems: 1 })),
      readPart: vi.fn().mockReturnValue(of(part)),
      readWarehouse: vi.fn().mockReturnValue(of(warehouse)),
      createPart: vi.fn().mockReturnValue(of(part)),
      updatePart: vi.fn().mockReturnValue(of(part)),
      createWarehouse: vi.fn().mockReturnValue(of(warehouse)),
      updateWarehouse: vi.fn().mockReturnValue(of(warehouse)),
      reconcileConsumption: vi.fn().mockReturnValue(of(consumption)),
      correctStock: vi.fn().mockReturnValue(of(movement)),
      returnConsumption: vi.fn().mockReturnValue(of(movement)),
    };
    const journal = {
      sessionRevision: () => revision,
      isCurrent: vi.fn((_user: string, _org: string, expected = revision) => revision === expected),
      readPending: vi.fn().mockResolvedValue([]),
      retain: vi.fn().mockResolvedValue(undefined),
      acknowledge: vi.fn().mockResolvedValue(undefined),
    };
    const dispatcher = { dispatch: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        InventoryStore,
        { provide: InventoryService, useValue: service },
        { provide: InventoryCommandRepository, useValue: journal },
        { provide: Dispatcher, useValue: dispatcher },
      ],
    });
    const store = TestBed.inject(InventoryStore);
    const activate = () => store.load({ organizationId: 'org', userId: 'user', section: 'parts' });
    return {
      store,
      service,
      journal,
      dispatcher,
      activate,
      replaceSession: () => {
        revision++;
      },
    };
  }
  it('uses authoritative reference filters and exact server pagination totals', () => {
    const { store, service } = setup();
    store.load({
      organizationId: 'org',
      userId: 'user',
      section: 'parts',
      search: 'seal',
      archived: true,
      page: 2,
    });
    expect(service.listParts).toHaveBeenCalledWith('org', {
      page: 2,
      itemsPerPage: 20,
      search: 'seal',
      params: { archived: true },
    });
    expect(store.pageCount()).toBe(3);
    expect(store.recordEntities()).toEqual([part]);
  });
  it('keeps quantities exact and hydrates retained archived identities outside active directory filters', () => {
    const { store, service } = setup();
    store.load({
      organizationId: 'org',
      userId: 'user',
      section: 'balances',
      partId: 'part',
      warehouseId: 'warehouse',
    });
    expect(service.listBalances).toHaveBeenCalledWith(
      'org',
      expect.objectContaining({ params: { partId: 'part', warehouseId: 'warehouse' } }),
    );
    expect(store.recordEntities()[0]).toEqual(balance);
    expect(store.partLabels()['part']).toBe('Seal');
    expect(store.partUnits()['part']).toBe('piece');
    expect(store.warehouseLabels()['warehouse']).toBe('Van');
    expect(service.readPart).toHaveBeenCalledWith('org', 'part');
    expect(service.listParts).not.toHaveBeenCalled();
  });
  it('does not discard stock facts when an old reference cannot be hydrated', () => {
    const { store, service } = setup();
    service.readPart.mockReturnValue(throwError(() => new Error('Reference unavailable')));
    store.load({ organizationId: 'org', userId: 'user', section: 'balances' });
    expect(store.recordEntities()).toEqual([balance]);
    expect(store.listCallState().status).toBe('success');
    expect(store.partLabels()['part']).toBeUndefined();
  });
  it('strips financial valuation from ordinary reads and write responses', async () => {
    const { store, service, activate } = setup();
    service.listMovements.mockReturnValue(
      of({
        member: [
          {
            ...movement,
            valuation: {
              unitCost: '9.000000',
              totalValue: '-9.000009',
              currency: 'EUR',
              incomplete: false,
            },
          },
        ],
        totalItems: 1,
      }),
    );
    store.load({ organizationId: 'org', userId: 'user', section: 'movements' });
    expect(store.recordEntities()[0]).not.toHaveProperty('valuation');
    activate();
    service.correctStock.mockReturnValue(
      of({ ...movement, valuation: { totalValue: '-9.000009' } }),
    );
    store.save(physical);
    await flush();
    expect(store.writeCallState().data).not.toHaveProperty('valuation');
  });
  it('cancels old directory responses and clears entity identities on organization changes', () => {
    const { store, service } = setup();
    const old = new Subject<{ member: readonly InventoryPartOutput[]; totalItems: number }>();
    service.listParts.mockReturnValueOnce(old);
    store.load({ organizationId: 'old', userId: 'user', section: 'parts' });
    store.load({ organizationId: 'new', userId: 'user', section: 'warehouses' });
    old.next({ member: [part], totalItems: 100 });
    expect(store.recordEntities()).toEqual([warehouse]);
    expect(store.total()).toBe(1);
    expect(store.partLabels()).toEqual({});
  });
  it('normalizes a read rejection and supports explicit retry', () => {
    const { store, service, activate } = setup();
    service.listParts.mockReturnValueOnce(throwError(() => new Error('Network unavailable')));
    activate();
    expect(store.listCallState().error?.message).toBe('Network unavailable');
    activate();
    expect(store.listCallState().status).toBe('success');
  });
  it('persists a stable physical command before POST and drops duplicate clicks while in flight', async () => {
    const { store, service, journal, activate } = setup();
    activate();
    let commit!: () => void;
    journal.retain.mockReturnValue(
      new Promise<void>((resolve) => {
        commit = resolve;
      }),
    );
    const response = new Subject<InventoryMovementOutput>();
    service.correctStock.mockReturnValue(response);
    store.save(physical);
    store.save(physical);
    expect(journal.retain).toHaveBeenCalledTimes(1);
    expect(service.correctStock).not.toHaveBeenCalled();
    commit();
    await flush();
    expect(service.correctStock).toHaveBeenCalledTimes(1);
    expect(store.pendingCommandEntities()).toEqual([physical]);
    expect(store.writeCallState().status).toBe('pending');
    response.next(movement);
    await flush();
    expect(journal.acknowledge).toHaveBeenCalledWith(physical, 1);
    expect(store.pendingCommandEntities()).toEqual([]);
  });
  it('never transmits when durable local storage rejects the physical command', async () => {
    const { store, service, journal, activate } = setup();
    journal.retain.mockRejectedValue(new Error('Storage full'));
    activate();
    store.save(physical);
    await flush();
    expect(service.correctStock).not.toHaveBeenCalled();
    expect(store.writeCallState().error?.message).toBe('Storage full');
    expect(store.pendingCommandEntities()).toEqual([]);
  });
  it('keeps the complete immutable intention after a lost response and replays only that UUID and body', async () => {
    const { store, service, journal, activate } = setup();
    service.correctStock.mockReturnValueOnce(throwError(() => new Error('Response lost')));
    activate();
    store.save(physical);
    await flush();
    expect(store.pendingCommandEntities()).toEqual([physical]);
    expect(journal.acknowledge).not.toHaveBeenCalled();
    store.save(physical);
    await flush();
    expect(service.correctStock.mock.calls[1]?.[1]).toBe(service.correctStock.mock.calls[0]?.[1]);
    expect(store.pendingCommandEntities()).toEqual([]);
  });
  it('does not send an old durable acceptance after the same account starts a different session', async () => {
    const { store, service, journal, activate, replaceSession } = setup();
    activate();
    let commit!: () => void;
    journal.retain.mockReturnValue(
      new Promise<void>((resolve) => {
        commit = resolve;
      }),
    );
    store.save(physical);
    replaceSession();
    commit();
    await flush();
    expect(service.correctStock).not.toHaveBeenCalled();
    expect(journal.acknowledge).not.toHaveBeenCalled();
  });
  it('suppresses old network acknowledgment and events after organization or session changes', async () => {
    const { store, service, journal, dispatcher, activate, replaceSession } = setup();
    activate();
    const response = new Subject<InventoryMovementOutput>();
    service.correctStock.mockReturnValue(response);
    store.save(physical);
    await flush();
    replaceSession();
    store.load({ organizationId: 'other', userId: 'user', section: 'warehouses' });
    response.next(movement);
    await flush();
    expect(journal.acknowledge).not.toHaveBeenCalled();
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
    expect(store.recordEntities()).toEqual([warehouse]);
  });
  it('reads local unresolved operations without automatically replaying them', async () => {
    const { store, journal, service } = setup();
    journal.readPending.mockResolvedValue([physical]);
    store.loadJournal({ organizationId: 'org', userId: 'user' });
    await flush();
    expect(store.pendingCommandEntities()).toEqual([physical]);
    expect(service.correctStock).not.toHaveBeenCalled();
  });
  it('does not treat a still-pending reconciliation response as a debit or finished task', async () => {
    const { store, service, journal, activate } = setup();
    activate();
    store.save({ kind: 'reconcile', organizationId: 'org', userId: 'user', id: consumption.id });
    await flush();
    expect(service.reconcileConsumption).toHaveBeenCalledWith('org', consumption.id);
    expect(store.writeCallState().data).toEqual(consumption);
    expect(journal.retain).not.toHaveBeenCalled();
    expect(journal.acknowledge).not.toHaveBeenCalled();
  });
});
