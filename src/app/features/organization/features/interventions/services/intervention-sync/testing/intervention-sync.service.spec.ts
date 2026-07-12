import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { CreateFacilityInput } from '@features/organization/features/facilities/models';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import {
  InterventionOfflineService,
  InterventionService,
} from '@features/organization/features/interventions/data-access';
import type {
  InterventionOutboxOperationFor,
  InterventionOutboxPayloadMap,
  InterventionOutboxType,
} from '@features/organization/features/interventions/models';
import { InterventionSyncService } from '../intervention-sync.service';

function operation<Type extends InterventionOutboxType>(
  id: string,
  type: Type,
  payload: InterventionOutboxPayloadMap[Type],
): InterventionOutboxOperationFor<Type> {
  return {
    id,
    interventionId: 'intervention-1',
    type,
    payload,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('InterventionSyncService', () => {
  let service: InterventionSyncService;
  let mockInterventionService: {
    createWorkItem: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateWorkItem: ReturnType<typeof vi.fn>;
    addComment: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    listAllWorkItems: ReturnType<typeof vi.fn>;
    listAllChanges: ReturnType<typeof vi.fn>;
  };
  let mockFacilities: { createForIntervention: ReturnType<typeof vi.fn> };
  let mockEquipment: {
    createForIntervention: ReturnType<typeof vi.fn>;
    uploadEvidence: ReturnType<typeof vi.fn>;
  };
  let mockInspections: { createForIntervention: ReturnType<typeof vi.fn> };
  let mockOffline: {
    listOutbox: ReturnType<typeof vi.fn>;
    removeOutbox: ReturnType<typeof vi.fn>;
    markOutboxConflict: ReturnType<typeof vi.fn>;
    markOutboxFailed: ReturnType<typeof vi.fn>;
    rebaseOutboxRevision: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockInterventionService = {
      createWorkItem: vi.fn().mockReturnValue(of({})),
      update: vi.fn().mockReturnValue(of({})),
      updateWorkItem: vi.fn().mockReturnValue(of({})),
      addComment: vi.fn().mockReturnValue(of({})),
      get: vi.fn().mockReturnValue(of({ revision: 0 })),
      listAllWorkItems: vi.fn().mockReturnValue(of([])),
      listAllChanges: vi.fn().mockReturnValue(of([])),
    };
    mockFacilities = { createForIntervention: vi.fn().mockReturnValue(of({})) };
    mockEquipment = {
      createForIntervention: vi.fn().mockReturnValue(of({})),
      uploadEvidence: vi.fn().mockReturnValue(of({})),
    };
    mockInspections = { createForIntervention: vi.fn().mockReturnValue(of({})) };
    mockOffline = {
      listOutbox: vi.fn().mockResolvedValue([]),
      removeOutbox: vi.fn().mockResolvedValue(undefined),
      markOutboxConflict: vi.fn().mockResolvedValue(undefined),
      markOutboxFailed: vi.fn().mockResolvedValue(undefined),
      rebaseOutboxRevision: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        InterventionSyncService,
        { provide: InterventionService, useValue: mockInterventionService },
        { provide: FacilityService, useValue: mockFacilities },
        { provide: EquipmentService, useValue: mockEquipment },
        { provide: InspectionService, useValue: mockInspections },
        { provide: InterventionOfflineService, useValue: mockOffline },
      ],
    });

    service = TestBed.inject(InterventionSyncService);
  });

  it('should replay queued operations in order and dequeue each of them', async () => {
    const facilityPayload: CreateFacilityInput = { name: 'Building A', type: 'building' };
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'facility.create', facilityPayload),
      operation('op-2', 'equipment.create', { type: 'fire_extinguisher' }),
    ]);

    const replayed = await service.replayOutbox('org-1', 'intervention-1');

    expect(replayed).toBe(2);
    expect(mockFacilities.createForIntervention).toHaveBeenCalledWith(
      'org-1',
      'intervention-1',
      facilityPayload,
    );
    expect(mockEquipment.createForIntervention).toHaveBeenCalledWith('org-1', 'intervention-1', {
      type: 'fire_extinguisher',
    });
    expect(mockOffline.removeOutbox).toHaveBeenNthCalledWith(1, 'op-1');
    expect(mockOffline.removeOutbox).toHaveBeenNthCalledWith(2, 'op-2');
  });

  it('should replay media operations with their binary payload', async () => {
    const file = new Blob(['photo'], { type: 'image/jpeg' });
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'media.create', {
        clientId: 'media-client-id',
        equipmentId: 'equipment-1',
        file,
        fileName: 'photo.jpg',
      }),
    ]);

    await service.replayOutbox('org-1', 'intervention-1');

    expect(mockEquipment.uploadEvidence).toHaveBeenCalledWith(
      'equipment-1',
      file,
      'photo.jpg',
      'intervention-1',
      'media-client-id',
    );
    expect(mockOffline.removeOutbox).toHaveBeenCalledWith('op-1');
  });

  it('should dequeue operations the server already applied', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'facility.create', { name: 'Building A', type: 'building' }),
    ]);
    mockFacilities.createForIntervention.mockReturnValue(
      throwError(() => ({
        status: 409,
        error: { type: '/problems/client-resource-already-exists' },
      })),
    );

    const replayed = await service.replayOutbox('org-1', 'intervention-1');

    expect(replayed).toBe(1);
    expect(mockOffline.removeOutbox).toHaveBeenCalledWith('op-1');
  });

  it('should keep a transient (5xx) operation queued but continue replaying the rest', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'facility.create', { name: 'Building A', type: 'building' }),
      operation('op-2', 'equipment.create', { type: 'fire_extinguisher' }),
    ]);
    mockFacilities.createForIntervention.mockReturnValue(throwError(() => ({ status: 500 })));

    const replayed = await service.replayOutbox('org-1', 'intervention-1');

    // A transient 5xx must not freeze the queue: op-1 stays queued (retried next
    // cycle) while the independent op-2 is still attempted and dequeued.
    expect(replayed).toBe(1);
    expect(mockEquipment.createForIntervention).toHaveBeenCalled();
    expect(mockOffline.removeOutbox).toHaveBeenCalledWith('op-2');
    expect(mockOffline.removeOutbox).not.toHaveBeenCalledWith('op-1');
  });

  it('should mark permanently rejected operations as failed and continue', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'facility.create', { name: 'Building A', type: 'building' }),
      operation('op-2', 'equipment.create', { type: 'fire_extinguisher' }),
    ]);
    mockFacilities.createForIntervention.mockReturnValue(
      throwError(() => ({ status: 422, error: { detail: 'The facility is invalid.' } })),
    );

    const replayed = await service.replayOutbox('org-1', 'intervention-1');

    expect(replayed).toBe(1);
    expect(mockOffline.markOutboxFailed).toHaveBeenCalledWith('op-1', 'The facility is invalid.');
    expect(mockOffline.removeOutbox).toHaveBeenCalledWith('op-2');
  });

  it('should serialize concurrent replay requests for the same intervention', async () => {
    let resolveList:
      | ((operations: readonly InterventionOutboxOperationFor<'facility.create'>[]) => void)
      | undefined;
    mockOffline.listOutbox.mockReturnValue(
      new Promise((resolve) => {
        resolveList = resolve;
      }),
    );

    const first = service.replayOutbox('org-1', 'intervention-1');
    const second = service.replayOutbox('org-1', 'intervention-1');
    resolveList?.([operation('op-1', 'facility.create', { name: 'Building A', type: 'building' })]);

    await expect(Promise.all([first, second])).resolves.toEqual([1, 1]);
    expect(mockOffline.listOutbox).toHaveBeenCalledOnce();
    expect(mockFacilities.createForIntervention).toHaveBeenCalledOnce();
  });

  it('should rebase a stale update onto the current revision and continue replaying', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'intervention.update', { status: 'in_progress', revision: 3 }),
      operation('op-2', 'equipment.create', { type: 'fire_extinguisher' }),
    ]);
    mockInterventionService.update.mockReturnValue(
      throwError(() => ({ status: 412, error: { detail: 'The intervention changed.' } })),
    );
    mockInterventionService.get.mockReturnValue(of({ revision: 7 }));

    const replayed = await service.replayOutbox('org-1', 'intervention-1');

    // op-1 is rebased onto the fresh revision (so a retry no longer loops on the
    // stale If-Match) and surfaced as a conflict; the independent op-2 replays.
    expect(replayed).toBe(1);
    expect(mockInterventionService.get).toHaveBeenCalledWith('intervention-1');
    expect(mockOffline.rebaseOutboxRevision).toHaveBeenCalledWith(
      'op-1',
      7,
      'The intervention changed.',
    );
    expect(mockOffline.markOutboxConflict).not.toHaveBeenCalled();
    expect(mockOffline.removeOutbox).toHaveBeenCalledWith('op-2');
    expect(mockEquipment.createForIntervention).toHaveBeenCalled();
  });

  it('should mark a plain conflict when the current revision cannot be resolved', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'work-item.update', {
        workItemId: 'work-item-1',
        status: 'completed',
        revision: 2,
      }),
    ]);
    mockInterventionService.updateWorkItem.mockReturnValue(
      throwError(() => ({ status: 412, error: { detail: 'The work item changed.' } })),
    );
    // The target work item is gone from the server, so no revision can be
    // rebased onto: fall back to a plain conflict mark (retry/discard).
    mockInterventionService.listAllWorkItems.mockReturnValue(of([]));

    const replayed = await service.replayOutbox('org-1', 'intervention-1');

    expect(replayed).toBe(0);
    expect(mockOffline.markOutboxConflict).toHaveBeenCalledWith('op-1', 'The work item changed.');
    expect(mockOffline.rebaseOutboxRevision).not.toHaveBeenCalled();
  });

  it('should treat an existing client UUID creation as already synchronized', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'equipment.create', {
        clientId: 'equipment-client-id',
        type: 'fire_extinguisher',
      }),
    ]);
    mockEquipment.createForIntervention.mockReturnValue(
      throwError(() => ({
        status: 412,
        error: { type: '/problems/client-resource-already-exists' },
      })),
    );

    const replayed = await service.replayOutbox('org-1', 'intervention-1');

    expect(replayed).toBe(1);
    expect(mockOffline.removeOutbox).toHaveBeenCalledWith('op-1');
    expect(mockOffline.markOutboxConflict).not.toHaveBeenCalled();
  });

  it('should suspend a client UUID creation on an unrelated precondition failure', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'equipment.create', {
        clientId: 'equipment-client-id',
        type: 'fire_extinguisher',
      }),
    ]);
    mockEquipment.createForIntervention.mockReturnValue(
      throwError(() => ({ status: 412, error: { detail: 'The intervention changed.' } })),
    );

    const replayed = await service.replayOutbox('org-1', 'intervention-1');

    expect(replayed).toBe(0);
    expect(mockOffline.markOutboxConflict).toHaveBeenCalledWith(
      'op-1',
      'The intervention changed.',
    );
    expect(mockOffline.removeOutbox).not.toHaveBeenCalled();
  });

  it('should fail an operation whose parent create is permanently conflicted', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'equipment.create', {
        clientId: 'equipment-client-id',
        type: 'fire_extinguisher',
      }),
      operation('op-2', 'work-item.create', {
        clientId: 'work-item-client-id',
        intervention: '/api/interventions/intervention-1',
        action: 'inventory',
        target: '/api/equipment/equipment-client-id',
        source: 'discovered',
        required: false,
      }),
    ]);
    mockEquipment.createForIntervention.mockReturnValue(
      throwError(() => ({ status: 412, error: { detail: 'The intervention changed.' } })),
    );

    const replayed = await service.replayOutbox('org-1', 'intervention-1');

    expect(replayed).toBe(0);
    expect(mockOffline.markOutboxConflict).toHaveBeenCalledWith(
      'op-1',
      'The intervention changed.',
    );
    // IF-16: the dependent is surfaced as failed (visible, actionable) instead
    // of sitting invisibly pending forever behind a parent that can never be
    // created.
    expect(mockOffline.markOutboxFailed).toHaveBeenCalledWith('op-2', expect.any(String));
    expect(mockInterventionService.createWorkItem).not.toHaveBeenCalled();
    expect(mockOffline.removeOutbox).not.toHaveBeenCalled();
  });

  it('should keep a dependent of a transient (5xx) parent pending, not failed', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'equipment.create', {
        clientId: 'equipment-client-id',
        type: 'fire_extinguisher',
      }),
      operation('op-2', 'work-item.create', {
        clientId: 'work-item-client-id',
        intervention: '/api/interventions/intervention-1',
        action: 'inventory',
        target: '/api/equipment/equipment-client-id',
        source: 'discovered',
        required: false,
      }),
    ]);
    mockEquipment.createForIntervention.mockReturnValue(throwError(() => ({ status: 503 })));

    const replayed = await service.replayOutbox('org-1', 'intervention-1');

    // The parent stays queued (transient 5xx), so its dependent must stay
    // pending for the next cycle — never marked failed or conflicted.
    expect(replayed).toBe(0);
    expect(mockOffline.markOutboxFailed).not.toHaveBeenCalled();
    expect(mockOffline.markOutboxConflict).not.toHaveBeenCalled();
    expect(mockInterventionService.createWorkItem).not.toHaveBeenCalled();
    expect(mockOffline.removeOutbox).not.toHaveBeenCalled();
  });

  it('should replay a queued offline comment and dequeue it', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'comment.create', {
        clientId: 'comment-client-id',
        body: 'Checked the extinguisher on site.',
      }),
    ]);

    const replayed = await service.replayOutbox('org-1', 'intervention-1');

    expect(replayed).toBe(1);
    expect(mockInterventionService.addComment).toHaveBeenCalledWith(
      'intervention-1',
      'Checked the extinguisher on site.',
    );
    expect(mockOffline.removeOutbox).toHaveBeenCalledWith('op-1');
  });

  it('should reject malformed media operations', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'media.create', {
        equipmentId: 'equipment-1',
      } as unknown as InterventionOutboxPayloadMap['media.create']),
    ]);

    await expect(service.replayOutbox('org-1', 'intervention-1')).resolves.toBe(0);
    expect(mockOffline.markOutboxFailed).toHaveBeenCalledWith(
      'op-1',
      'Invalid offline media operation',
    );
    expect(mockOffline.removeOutbox).not.toHaveBeenCalled();
  });
});
