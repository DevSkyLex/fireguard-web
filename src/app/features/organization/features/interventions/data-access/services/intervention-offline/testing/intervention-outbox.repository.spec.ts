import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Events } from '@ngrx/signals/events';
import { EMPTY } from 'rxjs';
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
});
