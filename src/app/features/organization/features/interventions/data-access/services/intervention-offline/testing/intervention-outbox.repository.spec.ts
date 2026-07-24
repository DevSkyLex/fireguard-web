import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Events } from '@ngrx/signals/events';
import { EMPTY, Subject } from 'rxjs';
import { USER_IDENTITY_PORT } from '@features/account/ports';
import type { InterventionOutboxOperation } from '@features/organization/features/interventions/models';
import { InterventionDatabaseService } from '../intervention-database.service';
import { InterventionOutboxRepository } from '../intervention-outbox.repository';

/**
 * Minimal in-memory IndexedDB stand-in backing the outbox object store, so the
 * pending/unsynced signal semantics can be exercised without a real database.
 */
function inMemoryDatabase(store: Map<string, InterventionOutboxOperation>): {
  browser: boolean;
  ensureOwnerBound: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  getAll: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
} {
  return {
    browser: true,
    ensureOwnerBound: vi.fn().mockResolvedValue(undefined),
    put: vi.fn(async (_collection: string, key: string, value: InterventionOutboxOperation) => {
      store.set(key, value);
    }),
    get: vi.fn(async (_collection: string, key: string) => store.get(key) ?? null),
    getAll: vi.fn(async () => [...store.values()]),
    remove: vi.fn(async (_collection: string, key: string) => {
      store.delete(key);
    }),
  };
}

function build(
  database: ReturnType<typeof inMemoryDatabase> | Record<string, unknown>,
): InterventionOutboxRepository {
  TestBed.configureTestingModule({
    providers: [
      InterventionOutboxRepository,
      { provide: InterventionDatabaseService, useValue: database },
      { provide: Events, useValue: { on: vi.fn().mockReturnValue(EMPTY) } },
      { provide: USER_IDENTITY_PORT, useValue: { profile: signal(null) } },
    ],
  });

  return TestBed.inject(InterventionOutboxRepository);
}

describe('InterventionOutboxRepository', () => {
  it('persists a grouped field intention in one IndexedDB transaction', async () => {
    const database = {
      browser: false,
      ensureOwnerBound: vi.fn().mockResolvedValue(undefined),
      putTransaction: vi.fn().mockResolvedValue(undefined),
    };
    const operationIds = await build(database).queueMany('intervention-1', [
      {
        type: 'equipment.create',
        payload: { clientId: 'equipment-1', type: 'fire_extinguisher' },
      },
      {
        type: 'work-item.create',
        payload: {
          clientId: 'work-item-1',
          intervention: '/api/interventions/intervention-1',
          action: 'inventory',
          target: '/api/equipment/equipment-1',
          source: 'discovered',
          required: false,
        },
      },
    ]);

    expect(operationIds).toHaveLength(2);
    expect(database.putTransaction).toHaveBeenCalledOnce();
    expect(database.putTransaction).toHaveBeenCalledWith({
      outbox: [
        expect.objectContaining({
          value: expect.objectContaining({
            type: 'equipment.create',
            payload: expect.objectContaining({ clientId: 'equipment-1' }),
          }),
        }),
        expect.objectContaining({
          value: expect.objectContaining({
            type: 'work-item.create',
            payload: expect.objectContaining({ clientId: 'work-item-1' }),
          }),
        }),
      ],
    });
  });

  it('keeps a failed operation unsynced but no longer pending', async () => {
    const store = new Map<string, InterventionOutboxOperation>();
    const repository = build(inMemoryDatabase(store));

    await repository.queue('intervention-1', 'intervention.update', {
      status: 'in_progress',
      revision: 1,
    });
    expect(repository.hasPendingChanges()).toBe(true);
    expect(repository.hasUnsyncedChanges()).toBe(true);

    const [operation] = [...store.values()];
    await repository.markOutboxFailed(operation.id, 'The server rejected this operation.');

    // The failed operation lingers (still unsynced) but can never sync on its
    // own, so a PWA update gating on `hasPendingChanges` must not deadlock.
    expect(repository.hasUnsyncedChanges()).toBe(true);
    expect(repository.hasPendingChanges()).toBe(false);
  });

  it('rebases a stale operation revision and surfaces it as a conflict', async () => {
    const store = new Map<string, InterventionOutboxOperation>();
    const repository = build(inMemoryDatabase(store));

    await repository.queue('intervention-1', 'intervention.update', {
      status: 'in_progress',
      revision: 1,
    });
    const [operation] = [...store.values()];

    await repository.rebaseOutboxRevision(operation.id, 5, 'This intervention changed.');

    const rebased = store.get(operation.id);
    expect((rebased?.payload as { readonly revision?: number } | undefined)?.revision).toBe(5);
    expect(rebased?.status).toBe('conflict');
    expect(rebased?.error).toBe('This intervention changed.');
    // A rebased conflict awaits explicit user resolution: unsynced, not pending.
    expect(repository.hasUnsyncedChanges()).toBe(true);
    expect(repository.hasPendingChanges()).toBe(false);
  });

  it('lists queued operations for one intervention in field entry order', async () => {
    const store = new Map<string, InterventionOutboxOperation>();
    const repository = build(inMemoryDatabase(store));

    await repository.queue('intervention-1', 'intervention.update', {
      status: 'in_progress',
      revision: 1,
    });
    await repository.queue('intervention-2', 'intervention.update', {
      status: 'planned',
      revision: 1,
    });
    await repository.queue('intervention-1', 'intervention.update', {
      status: 'submitted',
      revision: 2,
    });

    const operations = await repository.listOutbox('intervention-1');

    expect(operations).toHaveLength(2);
    expect((operations[0].payload as { readonly status?: string }).status).toBe('in_progress');
    expect((operations[1].payload as { readonly status?: string }).status).toBe('submitted');
  });

  it('returns an empty list on the server', async () => {
    const repository = build({ browser: false, ensureOwnerBound: vi.fn() });

    await expect(repository.listOutbox('intervention-1')).resolves.toEqual([]);
    await expect(repository.listInterventionIdsWithOutbox()).resolves.toEqual([]);
  });

  it('lists the distinct intervention ids with queued operations', async () => {
    const store = new Map<string, InterventionOutboxOperation>();
    const repository = build(inMemoryDatabase(store));

    await repository.queue('intervention-1', 'intervention.update', {
      status: 'in_progress',
      revision: 1,
    });
    await repository.queue('intervention-1', 'intervention.update', {
      status: 'submitted',
      revision: 2,
    });
    await repository.queue('intervention-2', 'intervention.update', {
      status: 'planned',
      revision: 1,
    });

    const ids = await repository.listInterventionIdsWithOutbox();

    expect(ids.toSorted()).toEqual(['intervention-1', 'intervention-2']);
  });

  it('removes a queued operation and recomputes unsynced state', async () => {
    const store = new Map<string, InterventionOutboxOperation>();
    const repository = build(inMemoryDatabase(store));

    await repository.queue('intervention-1', 'intervention.update', {
      status: 'in_progress',
      revision: 1,
    });
    const [operation] = [...store.values()];

    await repository.removeOutbox(operation.id);

    expect(store.has(operation.id)).toBe(false);
    expect(repository.hasUnsyncedChanges()).toBe(false);
    expect(repository.hasPendingChanges()).toBe(false);
    expect(repository.pendingCount()).toBe(0);
  });

  it('marks a queued operation as a conflict', async () => {
    const store = new Map<string, InterventionOutboxOperation>();
    const repository = build(inMemoryDatabase(store));

    await repository.queue('intervention-1', 'intervention.update', {
      status: 'in_progress',
      revision: 1,
    });
    const [operation] = [...store.values()];

    await repository.markOutboxConflict(operation.id, 'Stale revision.');

    expect(store.get(operation.id)?.status).toBe('conflict');
    expect(store.get(operation.id)?.error).toBe('Stale revision.');
    expect(repository.hasUnsyncedChanges()).toBe(true);
    expect(repository.hasPendingChanges()).toBe(false);
  });

  it('does nothing when marking a conflict on an operation that no longer exists', async () => {
    const store = new Map<string, InterventionOutboxOperation>();
    const repository = build(inMemoryDatabase(store));

    await repository.markOutboxConflict('missing-id', 'Stale revision.');

    expect(store.size).toBe(0);
  });

  it('does nothing when marking as failed an operation that no longer exists', async () => {
    const store = new Map<string, InterventionOutboxOperation>();
    const repository = build(inMemoryDatabase(store));

    await repository.markOutboxFailed('missing-id', 'Rejected.');

    expect(store.size).toBe(0);
  });

  it('does nothing when rebasing an operation that no longer exists', async () => {
    const store = new Map<string, InterventionOutboxOperation>();
    const repository = build(inMemoryDatabase(store));

    await repository.rebaseOutboxRevision('missing-id', 5, 'Stale revision.');

    expect(store.size).toBe(0);
  });

  it('does nothing when retrying an operation that no longer exists', async () => {
    const store = new Map<string, InterventionOutboxOperation>();
    const repository = build(inMemoryDatabase(store));

    await repository.retryOutbox('missing-id');

    expect(repository.hasPendingChanges()).toBe(false);
  });

  it('resets a conflicted operation back to pending and bumps the pending count', async () => {
    const store = new Map<string, InterventionOutboxOperation>();
    const repository = build(inMemoryDatabase(store));

    await repository.queue('intervention-1', 'intervention.update', {
      status: 'in_progress',
      revision: 1,
    });
    const [operation] = [...store.values()];
    await repository.markOutboxConflict(operation.id, 'Stale revision.');
    expect(repository.pendingCount()).toBe(0);

    await repository.retryOutbox(operation.id);

    expect(store.get(operation.id)?.status).toBe('pending');
    expect(store.get(operation.id)?.error).toBeNull();
    expect(repository.hasPendingChanges()).toBe(true);
    expect(repository.pendingCount()).toBe(1);
  });

  it('does not double-count the pending total when retrying an already-pending operation', async () => {
    const store = new Map<string, InterventionOutboxOperation>();
    const repository = build(inMemoryDatabase(store));

    await repository.queue('intervention-1', 'intervention.update', {
      status: 'in_progress',
      revision: 1,
    });
    const [operation] = [...store.values()];

    await repository.retryOutbox(operation.id);

    expect(repository.pendingCount()).toBe(1);
  });

  it('resets pending state on logout', async () => {
    const events = { on: vi.fn() };
    const logoutSubject = new Subject<unknown>();
    events.on.mockReturnValue(logoutSubject.asObservable());
    const store = new Map<string, InterventionOutboxOperation>();

    TestBed.configureTestingModule({
      providers: [
        InterventionOutboxRepository,
        { provide: InterventionDatabaseService, useValue: inMemoryDatabase(store) },
        { provide: Events, useValue: events },
        { provide: USER_IDENTITY_PORT, useValue: { profile: signal(null) } },
      ],
    });
    const repository = TestBed.inject(InterventionOutboxRepository);

    await repository.queue('intervention-1', 'intervention.update', {
      status: 'in_progress',
      revision: 1,
    });
    expect(repository.hasUnsyncedChanges()).toBe(true);

    logoutSubject.next(undefined);

    expect(repository.hasUnsyncedChanges()).toBe(false);
    expect(repository.hasPendingChanges()).toBe(false);
    expect(repository.pendingCount()).toBe(0);
  });

  it('binds the owner and refreshes state once the identity profile becomes available in the browser', async () => {
    const store = new Map<string, InterventionOutboxOperation>();
    store.set('op-1', {
      id: 'op-1',
      interventionId: 'intervention-1',
      type: 'intervention.update',
      payload: { status: 'in_progress', revision: 1, clientId: 'client-1' },
      createdAt: '2026-01-01T00:00:00.000Z',
      status: 'pending',
      error: null,
    } as InterventionOutboxOperation);
    const profile = signal<{ sub: string } | null>(null);
    const database = inMemoryDatabase(store);

    TestBed.configureTestingModule({
      providers: [
        InterventionOutboxRepository,
        { provide: InterventionDatabaseService, useValue: database },
        { provide: Events, useValue: { on: vi.fn().mockReturnValue(EMPTY) } },
        { provide: USER_IDENTITY_PORT, useValue: { profile } },
      ],
    });
    const repository = TestBed.inject(InterventionOutboxRepository);
    expect(repository.hasUnsyncedChanges()).toBe(false);

    profile.set({ sub: 'user-1' });
    TestBed.tick();

    await vi.waitFor(() => expect(database.ensureOwnerBound).toHaveBeenCalledWith('user-1'));
    await vi.waitFor(() => expect(repository.hasUnsyncedChanges()).toBe(true));
    expect(repository.pendingCount()).toBe(1);
  });
});
