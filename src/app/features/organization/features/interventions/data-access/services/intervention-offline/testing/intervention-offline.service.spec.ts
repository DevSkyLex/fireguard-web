import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type {
  InterventionOutput,
  PublicationTracking,
} from '@features/organization/features/interventions/models';
import { InterventionDatabaseService } from '../intervention-database.service';
import { InterventionOfflineService } from '../intervention-offline.service';
import { InterventionOutboxRepository } from '../intervention-outbox.repository';
import { InterventionWorkspaceRepository } from '../intervention-workspace.repository';

describe('InterventionOfflineService', () => {
  const database = {
    currentOwnerId: vi.fn(),
    ensureOwnerBound: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    remove: vi.fn(),
    removeWhere: vi.fn(),
    clearAll: vi.fn(),
  };
  const outbox = {
    hasUnsyncedChanges: signal(false),
    hasPendingChanges: signal(false),
    pendingCount: signal(0),
    listOutbox: vi.fn(),
    refresh: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    database.currentOwnerId.mockReturnValue('account-1');
    database.ensureOwnerBound.mockResolvedValue(undefined);
    database.put.mockResolvedValue(undefined);
    database.get.mockResolvedValue(null);
    database.remove.mockResolvedValue(undefined);
    database.removeWhere.mockResolvedValue(undefined);
    database.clearAll.mockResolvedValue(undefined);
    outbox.listOutbox.mockResolvedValue([]);
    outbox.refresh.mockResolvedValue(undefined);
  });

  /**
   * Function configurePersistence
   * @description Binds the facade to controllable persistence boundaries for account-switch and purge tests.
   * @access private
   * @since 1.0.0
   * @returns {InterventionOfflineService} Facade under test.
   */
  const configurePersistence = (): InterventionOfflineService => {
    TestBed.configureTestingModule({
      providers: [
        InterventionOfflineService,
        { provide: InterventionDatabaseService, useValue: database },
        { provide: InterventionOutboxRepository, useValue: outbox },
        { provide: InterventionWorkspaceRepository, useValue: {} },
      ],
    });
    return TestBed.inject(InterventionOfflineService);
  };

  it('does not replace a workspace snapshot while local operations are pending', async () => {
    const pendingOutbox = {
      hasUnsyncedChanges: () => true,
      listOutbox: vi.fn().mockResolvedValue([{ id: 'operation-1' }]),
    };
    const workspace = {
      saveWorkspace: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      providers: [
        InterventionOfflineService,
        { provide: InterventionDatabaseService, useValue: {} },
        { provide: InterventionOutboxRepository, useValue: pendingOutbox },
        { provide: InterventionWorkspaceRepository, useValue: workspace },
      ],
    });

    await TestBed.inject(InterventionOfflineService).saveWorkspace(
      { id: 'intervention-1' } as InterventionOutput,
      [],
      [],
      [],
    );

    expect(pendingOutbox.listOutbox).toHaveBeenCalledWith('intervention-1');
    expect(workspace.saveWorkspace).not.toHaveBeenCalled();
  });

  it('persists explicit local merges while operations are pending', async () => {
    const pendingOutbox = {
      hasUnsyncedChanges: () => true,
      listOutbox: vi.fn().mockResolvedValue([{ id: 'operation-1' }]),
    };
    const workspace = {
      saveWorkspace: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      providers: [
        InterventionOfflineService,
        { provide: InterventionDatabaseService, useValue: {} },
        { provide: InterventionOutboxRepository, useValue: pendingOutbox },
        { provide: InterventionWorkspaceRepository, useValue: workspace },
      ],
    });

    await TestBed.inject(InterventionOfflineService).saveWorkspace(
      { id: 'intervention-1' } as InterventionOutput,
      [],
      [],
      [],
      [],
      { replace: false },
    );

    expect(workspace.saveWorkspace).toHaveBeenCalledOnce();
  });

  it('scopes publication recovery metadata to account, organization and intervention', async () => {
    const service = configurePersistence();
    const tracking: PublicationTracking = {
      publicationId: 'publication-1',
      status: 'processing',
      checkedAt: 123,
    };
    database.get.mockResolvedValue(tracking);

    await service.savePublicationTracking('/api/organizations/org-1', 'intervention-1', tracking);
    const restored = await service.loadPublicationTracking(
      '/api/organizations/org-1',
      'intervention-1',
    );

    expect(database.ensureOwnerBound).toHaveBeenCalledTimes(2);
    expect(database.put).toHaveBeenCalledExactlyOnceWith(
      'metadata',
      'publication:account-1:/api/organizations/org-1:intervention-1',
      tracking,
    );
    expect(database.get).toHaveBeenCalledExactlyOnceWith(
      'metadata',
      'publication:account-1:/api/organizations/org-1:intervention-1',
    );
    expect(restored).toEqual(tracking);
  });

  it('does not read or persist publication metadata after logout', async () => {
    const service = configurePersistence();
    database.currentOwnerId.mockReturnValue(null);

    await service.savePublicationTracking('org-1', 'intervention-1', {
      publicationId: null,
      status: 'unknown',
      checkedAt: 1,
    });
    expect(await service.loadPublicationTracking('org-1', 'intervention-1')).toBeNull();

    expect(database.ensureOwnerBound).not.toHaveBeenCalled();
    expect(database.get).not.toHaveBeenCalled();
    expect(database.put).not.toHaveBeenCalled();
  });

  it.each(['save', 'load'] as const)(
    'abandons publication %s when the account changes while binding',
    async (operation) => {
      const service = configurePersistence();
      let completeBinding!: () => void;
      database.ensureOwnerBound.mockReturnValue(
        new Promise<void>((resolve) => {
          completeBinding = resolve;
        }),
      );
      const pending =
        operation === 'save'
          ? service.savePublicationTracking('org-1', 'intervention-1', {
              publicationId: null,
              status: 'unknown',
              checkedAt: 1,
            })
          : service.loadPublicationTracking('org-1', 'intervention-1');

      database.currentOwnerId.mockReturnValue('account-2');
      completeBinding();
      expect(await pending).toBe(operation === 'load' ? null : undefined);
      expect(database.put).not.toHaveBeenCalled();
      expect(database.get).not.toHaveBeenCalled();
    },
  );

  it('discards a pending recovery read when the account changes after IndexedDB is queried', async () => {
    const service = configurePersistence();
    database.get.mockImplementation(async () => {
      database.currentOwnerId.mockReturnValue('account-2');
      return { publicationId: 'old-account-publication', status: 'completed', checkedAt: 1 };
    });

    expect(await service.loadPublicationTracking('org-1', 'intervention-1')).toBeNull();
  });

  it('purges only the selected intervention across journal, drafts, resources and queued work', async () => {
    const service = configurePersistence();
    const stores = [
      'timeJournals',
      'timeDrafts',
      'workItems',
      'changes',
      'resources',
      'media',
      'outbox',
    ];
    const records = new Map(
      stores.map((store) => [
        store,
        [
          { interventionId: 'intervention-1', intervention: '/api/interventions/intervention-1' },
          { interventionId: 'intervention-2', intervention: '/api/interventions/intervention-2' },
        ],
      ]),
    );
    database.removeWhere.mockImplementation(
      async (
        store: string,
        predicate: (record: { interventionId: string; intervention: string }) => boolean,
      ) => {
        records.set(
          store,
          (records.get(store) ?? []).filter((record) => !predicate(record)),
        );
      },
    );

    await service.clearIntervention('intervention-1');

    expect(database.ensureOwnerBound).toHaveBeenCalledOnce();
    expect(database.remove).toHaveBeenCalledExactlyOnceWith('interventions', 'intervention-1');
    expect(database.removeWhere).toHaveBeenCalledTimes(stores.length);
    for (const store of stores) {
      expect(records.get(store)).toEqual([
        { interventionId: 'intervention-2', intervention: '/api/interventions/intervention-2' },
      ]);
    }
    expect(outbox.refresh).toHaveBeenCalledOnce();
  });

  it('does not announce an empty queue when a local purge fails', async () => {
    const service = configurePersistence();
    const failure = new Error('IndexedDB write refused');
    database.remove.mockRejectedValue(failure);

    await expect(service.clearIntervention('intervention-1')).rejects.toBe(failure);
    expect(outbox.refresh).not.toHaveBeenCalled();
  });

  it('refreshes the queue only after account-wide local deletion succeeds', async () => {
    const service = configurePersistence();
    await service.clearAll();
    expect(database.clearAll).toHaveBeenCalledOnce();
    expect(outbox.refresh).toHaveBeenCalledOnce();
    outbox.refresh.mockClear();
    database.clearAll.mockRejectedValue(new Error('Deletion failed'));

    await expect(service.clearAll()).rejects.toThrow('Deletion failed');
    expect(outbox.refresh).not.toHaveBeenCalled();
  });
});
