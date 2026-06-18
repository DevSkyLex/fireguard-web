import { TestBed } from '@angular/core/testing';
import { ConnectivityService } from '@core/services/connectivity';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import { InterventionSyncService } from '../../intervention-sync';
import { InterventionSyncCoordinatorService } from '../intervention-sync-coordinator.service';

describe('InterventionSyncCoordinatorService', () => {
  let connectivity: { isOffline: ReturnType<typeof vi.fn>; online: () => boolean };
  let offline: {
    listInterventionIdsWithOutbox: ReturnType<typeof vi.fn>;
    organizationIdForIntervention: ReturnType<typeof vi.fn>;
    listOutbox: ReturnType<typeof vi.fn>;
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
});
