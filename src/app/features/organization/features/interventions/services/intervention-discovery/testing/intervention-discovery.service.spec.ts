import { TestBed } from '@angular/core/testing';
import { ConnectivityService } from '@core/services/connectivity';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import type { InterventionOutboxOperation } from '@features/organization/features/interventions/models';
import { InterventionFieldExecutionService } from '../../intervention-field-execution';
import { InterventionSyncService } from '../../intervention-sync';
import { InterventionSyncCoordinatorService } from '../../intervention-sync-coordinator';
import { InterventionDiscoveryService } from '../intervention-discovery.service';

describe('InterventionDiscoveryService', () => {
  let service: InterventionDiscoveryService;
  let offline: {
    queueMany: ReturnType<typeof vi.fn>;
    listOutbox: ReturnType<typeof vi.fn>;
  };
  let sync: { replayOutbox: ReturnType<typeof vi.fn> };
  let syncCoordinator: { refreshStatus: ReturnType<typeof vi.fn> };
  let connectivity: { isOffline: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    offline = {
      queueMany: vi.fn().mockResolvedValue(['resource-operation', 'work-item-operation']),
      listOutbox: vi.fn().mockResolvedValue([]),
    };
    sync = { replayOutbox: vi.fn().mockResolvedValue(2) };
    syncCoordinator = { refreshStatus: vi.fn().mockResolvedValue(undefined) };
    connectivity = { isOffline: vi.fn().mockReturnValue(false) };

    TestBed.configureTestingModule({
      providers: [
        InterventionDiscoveryService,
        {
          provide: InterventionFieldExecutionService,
          useValue: {
            prepareDiscoveryResource: vi.fn().mockReturnValue({
              type: 'equipment.create',
              payload: {
                clientId: 'equipment-client-id',
                organization: '/api/organizations/org-1',
                intervention: '/api/interventions/intervention-1',
                type: 'fire_extinguisher',
              },
              targetResource: '/api/equipment/equipment-client-id',
            }),
          },
        },
        { provide: ConnectivityService, useValue: connectivity },
        { provide: InterventionOfflineService, useValue: offline },
        { provide: InterventionSyncService, useValue: sync },
        { provide: InterventionSyncCoordinatorService, useValue: syncCoordinator },
      ],
    });

    service = TestBed.inject(InterventionDiscoveryService);
  });

  it('atomically persists the resource and discovered work item before replaying them', async () => {
    const result = await service.create('org-1', 'intervention-1', {
      action: 'inventory',
      target: 'fire_extinguisher',
      result: 'pass',
    });

    expect(offline.queueMany).toHaveBeenCalledOnce();
    expect(offline.queueMany).toHaveBeenCalledWith(
      'intervention-1',
      expect.arrayContaining([
        expect.objectContaining({ type: 'equipment.create' }),
        expect.objectContaining({
          type: 'work-item.create',
          payload: expect.objectContaining({
            target: '/api/equipment/equipment-client-id',
            source: 'discovered',
          }),
        }),
      ]),
    );
    expect(sync.replayOutbox).toHaveBeenCalledWith('org-1', 'intervention-1');
    expect(syncCoordinator.refreshStatus).toHaveBeenCalledOnce();
    expect(result.queued).toBe(false);
  });

  it('keeps the stable durable intention queued when replay fails', async () => {
    sync.replayOutbox.mockRejectedValue(new Error('Network failure'));

    const result = await service.create('org-1', 'intervention-1', {
      action: 'inventory',
      target: 'fire_extinguisher',
      result: 'pass',
    });

    expect(result.queued).toBe(true);
    expect(offline.queueMany).toHaveBeenCalledOnce();
  });

  it('reports a discovery as queued while one of its operations remains pending', async () => {
    offline.listOutbox.mockResolvedValue([
      { id: 'work-item-operation' } as InterventionOutboxOperation,
    ]);

    const result = await service.create('org-1', 'intervention-1', {
      action: 'inventory',
      target: 'fire_extinguisher',
      result: 'pass',
    });

    expect(result.queued).toBe(true);
  });
});
