import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConnectivityService } from '@core/connectivity';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import { InterventionSyncService } from '../../intervention-sync';
import { InterventionSyncCoordinatorService } from '../intervention-sync-coordinator.service';

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

describe('InterventionSyncCoordinatorService', () => {
  let connectivity: { isOffline: ReturnType<typeof vi.fn>; online: () => boolean };
  let offline: {
    listInterventionIdsWithOutbox: ReturnType<typeof vi.fn>;
    organizationIdForIntervention: ReturnType<typeof vi.fn>;
    listOutbox: ReturnType<typeof vi.fn>;
    retryOutbox: ReturnType<typeof vi.fn>;
    removeOutbox: ReturnType<typeof vi.fn>;
  };
  let sync: { replayOutbox: ReturnType<typeof vi.fn> };

  function build(): InterventionSyncCoordinatorService {
    TestBed.configureTestingModule({
      providers: [
        InterventionSyncCoordinatorService,
        { provide: ConnectivityService, useValue: connectivity },
        { provide: InterventionOfflineService, useValue: offline },
        { provide: InterventionSyncService, useValue: sync },
      ],
    });

    return TestBed.inject(InterventionSyncCoordinatorService);
  }

  beforeEach(() => {
    connectivity = { isOffline: vi.fn().mockReturnValue(false), online: () => true };
    offline = {
      listInterventionIdsWithOutbox: vi.fn().mockResolvedValue([]),
      organizationIdForIntervention: vi.fn().mockResolvedValue('org-1'),
      listOutbox: vi.fn().mockResolvedValue([]),
      retryOutbox: vi.fn().mockResolvedValue(undefined),
      removeOutbox: vi.fn().mockResolvedValue(undefined),
    };
    sync = { replayOutbox: vi.fn().mockResolvedValue(undefined) };
  });

  it('should not replay the outbox while offline', async () => {
    connectivity.isOffline.mockReturnValue(true);

    await build().syncAll();

    expect(offline.listInterventionIdsWithOutbox).not.toHaveBeenCalled();
  });

  it('should replay each queued intervention in its organization context', async () => {
    offline.listInterventionIdsWithOutbox.mockResolvedValue(['i-1']);
    const service = build();

    await service.syncAll();

    expect(sync.replayOutbox).toHaveBeenCalledWith('org-1', 'i-1');
    expect(service.syncing()).toBe(false);
  });

  it('should surface the count and message of blocked operations', async () => {
    offline.listInterventionIdsWithOutbox.mockResolvedValue(['i-1']);
    offline.listOutbox.mockResolvedValue([{ id: 'op-1', status: 'conflict', error: 'Conflict!' }]);
    const service = build();

    await service.refreshStatus();

    expect(service.blockedOperations()).toBe(1);
    expect(service.problem()).toBe('Conflict!');
  });

  describe('start and the connectivity effect', () => {
    let online: WritableSignal<boolean>;
    let connectivityWithSignal: { isOffline: ReturnType<typeof vi.fn>; online: () => boolean };

    function buildWithSignalConnectivity(): InterventionSyncCoordinatorService {
      TestBed.configureTestingModule({
        providers: [
          InterventionSyncCoordinatorService,
          { provide: ConnectivityService, useValue: connectivityWithSignal },
          { provide: InterventionOfflineService, useValue: offline },
          { provide: InterventionSyncService, useValue: sync },
        ],
      });

      return TestBed.inject(InterventionSyncCoordinatorService);
    }

    beforeEach(() => {
      online = signal<boolean>(true);
      connectivityWithSignal = {
        isOffline: vi.fn(() => !online()),
        online: () => online(),
      };
      offline.listInterventionIdsWithOutbox.mockResolvedValue(['i-1']);
    });

    it('should not replay before start() is called, even while online and visible', async () => {
      buildWithSignalConnectivity();
      TestBed.tick();
      await flush();

      expect(offline.listInterventionIdsWithOutbox).not.toHaveBeenCalled();
    });

    it('should replay automatically once started, while online and visible', async () => {
      const service = buildWithSignalConnectivity();

      service.start();
      TestBed.tick();
      await flush();

      expect(sync.replayOutbox).toHaveBeenCalledWith('org-1', 'i-1');
    });

    it('should auto-replay when connectivity returns after being lost', async () => {
      online.set(false);
      const service = buildWithSignalConnectivity();

      service.start();
      TestBed.tick();
      await flush();
      expect(sync.replayOutbox).not.toHaveBeenCalled();

      online.set(true);
      TestBed.tick();
      await flush();

      expect(sync.replayOutbox).toHaveBeenCalledWith('org-1', 'i-1');
    });
  });

  describe('retryBlocked', () => {
    it('should reset every conflicted or failed operation to pending, then replay the outbox', async () => {
      offline.listInterventionIdsWithOutbox.mockResolvedValue(['i-1']);
      offline.listOutbox.mockResolvedValue([
        { id: 'op-1', status: 'conflict', error: 'Conflict!' },
        { id: 'op-2', status: 'failed', error: 'Failed!' },
        { id: 'op-3', status: 'pending', error: null },
      ]);
      const service = build();

      await service.retryBlocked();

      expect(offline.retryOutbox).toHaveBeenCalledWith('op-1');
      expect(offline.retryOutbox).toHaveBeenCalledWith('op-2');
      expect(offline.retryOutbox).not.toHaveBeenCalledWith('op-3');
      expect(sync.replayOutbox).toHaveBeenCalledWith('org-1', 'i-1');
    });
  });

  describe('discardBlocked', () => {
    it('should permanently remove every conflicted or failed operation and refresh status', async () => {
      offline.listInterventionIdsWithOutbox.mockResolvedValue(['i-1']);
      offline.listOutbox
        .mockResolvedValueOnce([
          { id: 'op-1', status: 'conflict', error: 'Conflict!' },
          { id: 'op-2', status: 'failed', error: 'Failed!' },
          { id: 'op-3', status: 'pending', error: null },
        ])
        .mockResolvedValueOnce([{ id: 'op-3', status: 'pending', error: null }]);
      const service = build();

      await service.discardBlocked();

      expect(offline.removeOutbox).toHaveBeenCalledWith('op-1');
      expect(offline.removeOutbox).toHaveBeenCalledWith('op-2');
      expect(offline.removeOutbox).not.toHaveBeenCalledWith('op-3');
      expect(service.blockedOperations()).toBe(0);
      expect(sync.replayOutbox).not.toHaveBeenCalled();
    });
  });
});
