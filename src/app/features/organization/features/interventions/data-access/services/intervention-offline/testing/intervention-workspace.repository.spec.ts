import { TestBed } from '@angular/core/testing';
import type { EquipmentTypeOutput } from '@features/organization/features/equipments/models';
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
  currentOwnerId: ReturnType<typeof vi.fn>;
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
    currentOwnerId: vi.fn().mockReturnValue('account-1'),
    put: vi.fn(
      async (storeName: string, key: string, value: unknown, isCurrent?: () => boolean) => {
        if (isCurrent && !isCurrent()) throw new DOMException('Owner changed.', 'AbortError');
        storeFor(storeName).set(key, value);
      },
    ),
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

const equipmentTypes: readonly EquipmentTypeOutput[] = [
  {
    '@id': '/api/organizations/org-1/equipment-types/fire_extinguisher',
    '@type': 'EquipmentType',
    value: 'fire_extinguisher',
    label: 'Extinguisher',
    family: 'fire',
    archived: false,
    revision: 1,
  },
  {
    '@id': '/api/organizations/org-1/equipment-types/legacy_pump',
    '@type': 'EquipmentType',
    value: 'legacy_pump',
    label: 'Legacy fire pump',
    family: 'fire',
    archived: true,
    revision: 4,
  },
];

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

  describe('equipment catalogue persistence', () => {
    const catalogKey = 'equipmentCatalog:account-1:org-1:intervention-1';

    it('restores the complete catalogue with archived entries and refreshed labels', async () => {
      const stores = new Map<string, Map<string, unknown>>();
      const { repository } = build(stores);
      await repository.saveWorkspace(intervention, [workItem], [change], [issue]);
      await repository.saveEquipmentCatalog('intervention-1', 'org-1', equipmentTypes, 'account-1');
      expect((await repository.getWorkspace('intervention-1'))?.equipmentCatalog).toEqual({
        version: 1,
        accountId: 'account-1',
        organizationId: 'org-1',
        capturedAt: expect.any(String),
        entries: equipmentTypes,
      });

      const updated = equipmentTypes.map((entry) => ({
        ...entry,
        label: `${entry.label} updated`,
        revision: entry.revision + 1,
      }));
      await repository.saveEquipmentCatalog('intervention-1', 'org-1', updated, 'account-1');
      expect((await repository.getWorkspace('intervention-1'))?.equipmentCatalog?.entries).toEqual(
        updated,
      );
      expect(stores.get('metadata')?.get(catalogKey)).toMatchObject({ entries: updated });
      expect(updated[1]?.archived).toBe(true);
    });

    it('preserves catalogue metadata through replacement and local workspace merges', async () => {
      const stores = new Map<string, Map<string, unknown>>();
      const { repository } = build(stores);
      await repository.saveWorkspace(intervention, [workItem], [], []);
      await repository.saveEquipmentCatalog('intervention-1', 'org-1', equipmentTypes, 'account-1');
      await repository.saveWorkspace(intervention, [workItem], [change], [issue]);
      await repository.saveWorkspace(
        intervention,
        [{ ...workItem, status: 'completed' }],
        [],
        [],
        [],
        {
          replace: false,
        },
      );

      const snapshot = await repository.getWorkspace('intervention-1');
      expect(snapshot?.equipmentCatalog?.entries).toEqual(equipmentTypes);
      expect(snapshot?.workItems[0]?.status).toBe('completed');
    });

    it('keeps historical workspaces readable when no catalogue was saved', async () => {
      const { repository } = build(new Map());
      await repository.saveWorkspace(intervention, [workItem], [change], [issue]);
      const snapshot = await repository.getWorkspace('intervention-1');
      expect(snapshot?.workItems).toEqual([workItem]);
      expect(snapshot).not.toHaveProperty('equipmentCatalog');
    });

    it.each(['accountId', 'organizationId', 'version'] as const)(
      'rejects mismatched cached catalogue %s metadata',
      async (field) => {
        const stores = new Map<string, Map<string, unknown>>();
        const { repository } = build(stores);
        await repository.saveWorkspace(intervention, [], [], []);
        const invalid = {
          version: 1,
          accountId: 'account-1',
          organizationId: 'org-1',
          capturedAt: '2026-10-06T09:00:00Z',
          entries: equipmentTypes,
          [field]: field === 'version' ? 2 : 'other-owner',
        };
        stores.get('metadata')?.set(catalogKey, invalid);
        expect(await repository.getWorkspace('intervention-1')).not.toHaveProperty(
          'equipmentCatalog',
        );
      },
    );

    it('does not cache a catalogue for another organization or a missing workspace', async () => {
      const stores = new Map<string, Map<string, unknown>>();
      const { repository, database } = build(stores);
      await repository.saveWorkspace(intervention, [], [], []);
      database.put.mockClear();
      await repository.saveEquipmentCatalog('intervention-1', 'org-2', equipmentTypes, 'account-1');
      await repository.saveEquipmentCatalog('missing', 'org-1', equipmentTypes, 'account-1');
      expect(database.put).not.toHaveBeenCalled();
    });

    it.each([null, 'account-2'])(
      'ignores a stale requesting owner %s before binding',
      async (owner) => {
        const { repository, database } = build(new Map());
        await repository.saveEquipmentCatalog('intervention-1', 'org-1', equipmentTypes, owner);
        expect(database.ensureOwnerBound).not.toHaveBeenCalled();
        expect(database.get).not.toHaveBeenCalled();
        expect(database.put).not.toHaveBeenCalled();
      },
    );

    it('abandons a catalogue after the account changes while binding the database', async () => {
      const { repository, database } = build(new Map());
      let finishBinding!: () => void;
      database.ensureOwnerBound.mockReturnValueOnce(
        new Promise<void>((resolve) => {
          finishBinding = resolve;
        }),
      );
      const saving = repository.saveEquipmentCatalog(
        'intervention-1',
        'org-1',
        equipmentTypes,
        'account-1',
      );
      database.currentOwnerId.mockReturnValue('account-2');
      finishBinding();
      await saving;
      expect(database.get).not.toHaveBeenCalled();
      expect(database.put).not.toHaveBeenCalled();
    });

    it('guards the metadata transaction against an account switch while IndexedDB opens', async () => {
      const stores = new Map<string, Map<string, unknown>>();
      const { repository, database } = build(stores);
      await repository.saveWorkspace(intervention, [], [], []);
      database.put.mockImplementationOnce(
        async (_store: string, _key: string, _value: unknown, isCurrent?: () => boolean) => {
          database.currentOwnerId.mockReturnValue('account-2');
          if (!isCurrent?.()) throw new DOMException('Owner changed.', 'AbortError');
        },
      );
      await expect(
        repository.saveEquipmentCatalog('intervention-1', 'org-1', equipmentTypes, 'account-1'),
      ).rejects.toMatchObject({ name: 'AbortError' });
      expect(stores.get('metadata')?.has(catalogKey)).toBe(false);
    });

    it('does not write a catalogue after its owning workspace read crosses accounts', async () => {
      const { repository, database } = build(new Map());
      database.get.mockImplementationOnce(async () => {
        database.currentOwnerId.mockReturnValue('account-2');
        return intervention;
      });
      await repository.saveEquipmentCatalog('intervention-1', 'org-1', equipmentTypes, 'account-1');
      expect(database.put).not.toHaveBeenCalled();
    });

    it('discards a late workspace read after its catalogue is read under another account', async () => {
      const stores = new Map<string, Map<string, unknown>>();
      const { repository, database } = build(stores);
      await repository.saveWorkspace(intervention, [workItem], [], []);
      await repository.saveEquipmentCatalog('intervention-1', 'org-1', equipmentTypes, 'account-1');
      database.get.mockImplementation(async (storeName: string, key: string) => {
        const value = stores.get(storeName)?.get(key) ?? null;
        if (storeName === 'metadata') database.currentOwnerId.mockReturnValue('account-2');
        return value;
      });
      expect(await repository.getWorkspace('intervention-1')).toBeNull();
    });

    it('reads only the catalogue key belonging to the current account', async () => {
      const stores = new Map<string, Map<string, unknown>>();
      const { repository, database } = build(stores);
      await repository.saveWorkspace(intervention, [], [], []);
      await repository.saveEquipmentCatalog('intervention-1', 'org-1', equipmentTypes, 'account-1');
      database.currentOwnerId.mockReturnValue('account-2');
      database.get.mockClear();
      expect(await repository.getWorkspace('intervention-1')).not.toHaveProperty(
        'equipmentCatalog',
      );
      expect(database.get).toHaveBeenCalledWith(
        'metadata',
        'equipmentCatalog:account-2:org-1:intervention-1',
      );
      expect(database.get).not.toHaveBeenCalledWith('metadata', catalogKey);
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
