import { TestBed } from '@angular/core/testing';
import type {
  InterventionChangeOutput,
  InterventionIssueOutput,
  InterventionOutput,
  InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';
import { InterventionDatabaseService } from '../intervention-database.service';
import { InterventionWorkspaceRepository } from '../intervention-workspace.repository';

/**
 * Minimal in-memory IndexedDB stand-in, keyed by store name then record key,
 * so the repository's normalized read/write shape can be exercised without a
 * real database.
 */
function inMemoryDatabase(stores: Map<string, Map<string, unknown>>): {
  ensureOwnerBound: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  putMany: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  getAll: ReturnType<typeof vi.fn>;
  removeWhere: ReturnType<typeof vi.fn>;
} {
  function storeFor(name: string): Map<string, unknown> {
    let store = stores.get(name);
    if (!store) {
      store = new Map<string, unknown>();
      stores.set(name, store);
    }
    return store;
  }

  return {
    ensureOwnerBound: vi.fn().mockResolvedValue(undefined),
    put: vi.fn(async (storeName: string, key: string, value: unknown) => {
      storeFor(storeName).set(key, value);
    }),
    putMany: vi.fn(
      async (storeName: string, entries: ReadonlyArray<{ key: string; value: unknown }>) => {
        const store = storeFor(storeName);
        for (const entry of entries) store.set(entry.key, entry.value);
      },
    ),
    get: vi.fn(async (storeName: string, key: string) => storeFor(storeName).get(key) ?? null),
    getAll: vi.fn(async (storeName: string) => [...storeFor(storeName).values()]),
    removeWhere: vi.fn(async (storeName: string, predicate: (value: unknown) => boolean) => {
      const store = storeFor(storeName);
      for (const [key, value] of store) if (predicate(value)) store.delete(key);
    }),
  };
}

function build(stores: Map<string, Map<string, unknown>>): {
  repository: InterventionWorkspaceRepository;
  database: ReturnType<typeof inMemoryDatabase>;
} {
  const database = inMemoryDatabase(stores);
  TestBed.configureTestingModule({
    providers: [
      InterventionWorkspaceRepository,
      { provide: InterventionDatabaseService, useValue: database },
    ],
  });

  return { repository: TestBed.inject(InterventionWorkspaceRepository), database };
}

const intervention = {
  id: 'intervention-1',
  organization: '/api/organizations/org-1',
} as unknown as InterventionOutput;

const workItem = {
  id: 'wi-1',
  intervention: '/api/interventions/intervention-1',
} as unknown as InterventionWorkItemOutput;

const change = {
  id: 'ch-1',
  intervention: '/api/interventions/intervention-1',
} as unknown as InterventionChangeOutput;

const issue = { id: 'issue-1' } as unknown as InterventionIssueOutput;

describe('InterventionWorkspaceRepository', () => {
  describe('saveWorkspace / getWorkspace', () => {
    it('should round-trip a saved workspace through the normalized stores', async () => {
      const stores = new Map<string, Map<string, unknown>>();
      const { repository, database } = build(stores);

      await repository.saveWorkspace(intervention, [workItem], [change], [issue]);

      expect(database.ensureOwnerBound).toHaveBeenCalled();
      const snapshot = await repository.getWorkspace('intervention-1');

      expect(snapshot?.intervention).toEqual(intervention);
      expect(snapshot?.workItems).toEqual([workItem]);
      expect(snapshot?.changes).toEqual([change]);
      expect(snapshot?.issues).toEqual([issue]);
    });

    it('should return null when no workspace was ever persisted for the intervention', async () => {
      const { repository } = build(new Map());

      await expect(repository.getWorkspace('missing')).resolves.toBeNull();
    });
  });

  describe('saveWorkspace replace semantics', () => {
    it('should clear the prior work items, changes and resources by default before writing', async () => {
      const stores = new Map<string, Map<string, unknown>>();
      const { repository } = build(stores);

      await repository.saveWorkspace(intervention, [workItem], [change], [issue]);
      const staleWorkItem = { ...workItem, id: 'wi-stale' } as InterventionWorkItemOutput;
      await repository.saveWorkspace(intervention, [staleWorkItem], [], []);

      const snapshot = await repository.getWorkspace('intervention-1');

      expect(snapshot?.workItems).toEqual([staleWorkItem]);
      expect(snapshot?.changes).toEqual([]);
      expect(snapshot?.issues).toEqual([]);
    });

    it('should merge onto the prior state instead of clearing it when replace is false', async () => {
      const stores = new Map<string, Map<string, unknown>>();
      const { repository } = build(stores);

      await repository.saveWorkspace(intervention, [workItem], [change], [issue]);
      const additionalWorkItem = { ...workItem, id: 'wi-2' } as InterventionWorkItemOutput;
      await repository.saveWorkspace(intervention, [additionalWorkItem], [], [], [], {
        replace: false,
      });

      const snapshot = await repository.getWorkspace('intervention-1');

      expect(snapshot?.workItems.map((item) => item.id).toSorted()).toEqual(['wi-1', 'wi-2']);
      expect(snapshot?.changes).toEqual([change]);
    });
  });

  describe('listInterventions', () => {
    it('should scope the local interventions to the requested organization', async () => {
      const stores = new Map<string, Map<string, unknown>>();
      const { repository } = build(stores);
      const otherOrgIntervention = {
        id: 'intervention-2',
        organization: '/api/organizations/org-2',
      } as unknown as InterventionOutput;

      await repository.saveWorkspace(intervention, [], [], []);
      await repository.saveWorkspace(otherOrgIntervention, [], [], []);

      const results = await repository.listInterventions('org-1');

      expect(results).toEqual([intervention]);
    });
  });

  describe('organizationIdForIntervention', () => {
    it('should resolve the owning organization id from the stored IRI', async () => {
      const stores = new Map<string, Map<string, unknown>>();
      const { repository } = build(stores);
      await repository.saveWorkspace(intervention, [], [], []);

      await expect(repository.organizationIdForIntervention('intervention-1')).resolves.toBe(
        'org-1',
      );
    });

    it('should return null when the intervention is not persisted locally', async () => {
      const { repository } = build(new Map());

      await expect(repository.organizationIdForIntervention('missing')).resolves.toBeNull();
    });
  });
});
