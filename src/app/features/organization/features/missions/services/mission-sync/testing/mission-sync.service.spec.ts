import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { CreateFacilityInput } from '@features/organization/features/facilities/models';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import { MissionService } from '@features/organization/features/missions/data-access';
import type {
  MissionOutboxOperationFor,
  MissionOutboxPayloadMap,
  MissionOutboxType,
} from '@features/organization/features/missions/models';
import { MissionOfflineService } from '../../mission-offline';
import { MissionSyncService } from '../mission-sync.service';

function operation<Type extends MissionOutboxType>(
  id: string,
  type: Type,
  payload: MissionOutboxPayloadMap[Type],
): MissionOutboxOperationFor<Type> {
  return {
    id,
    missionId: 'mission-1',
    type,
    payload,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('MissionSyncService', () => {
  let service: MissionSyncService;
  let mockMissionService: {
    createWorkItem: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let mockFacilities: { createForMission: ReturnType<typeof vi.fn> };
  let mockEquipment: {
    createForMission: ReturnType<typeof vi.fn>;
    uploadEvidence: ReturnType<typeof vi.fn>;
  };
  let mockInspections: { createForMission: ReturnType<typeof vi.fn> };
  let mockOffline: {
    listOutbox: ReturnType<typeof vi.fn>;
    removeOutbox: ReturnType<typeof vi.fn>;
    markOutboxConflict: ReturnType<typeof vi.fn>;
    markOutboxFailed: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockMissionService = {
      createWorkItem: vi.fn().mockReturnValue(of({})),
      update: vi.fn().mockReturnValue(of({})),
    };
    mockFacilities = { createForMission: vi.fn().mockReturnValue(of({})) };
    mockEquipment = {
      createForMission: vi.fn().mockReturnValue(of({})),
      uploadEvidence: vi.fn().mockReturnValue(of({})),
    };
    mockInspections = { createForMission: vi.fn().mockReturnValue(of({})) };
    mockOffline = {
      listOutbox: vi.fn().mockResolvedValue([]),
      removeOutbox: vi.fn().mockResolvedValue(undefined),
      markOutboxConflict: vi.fn().mockResolvedValue(undefined),
      markOutboxFailed: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        MissionSyncService,
        { provide: MissionService, useValue: mockMissionService },
        { provide: FacilityService, useValue: mockFacilities },
        { provide: EquipmentService, useValue: mockEquipment },
        { provide: InspectionService, useValue: mockInspections },
        { provide: MissionOfflineService, useValue: mockOffline },
      ],
    });

    service = TestBed.inject(MissionSyncService);
  });

  it('should replay queued operations in order and dequeue each of them', async () => {
    const facilityPayload: CreateFacilityInput = { name: 'Building A', type: 'building' };
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'facility.create', facilityPayload),
      operation('op-2', 'equipment.create', { type: 'fire_extinguisher' }),
    ]);

    const replayed = await service.replayOutbox('org-1', 'mission-1');

    expect(replayed).toBe(2);
    expect(mockFacilities.createForMission).toHaveBeenCalledWith(
      'org-1',
      'mission-1',
      facilityPayload,
    );
    expect(mockEquipment.createForMission).toHaveBeenCalledWith('org-1', 'mission-1', {
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

    await service.replayOutbox('org-1', 'mission-1');

    expect(mockEquipment.uploadEvidence).toHaveBeenCalledWith(
      'equipment-1',
      file,
      'photo.jpg',
      'mission-1',
      'media-client-id',
    );
    expect(mockOffline.removeOutbox).toHaveBeenCalledWith('op-1');
  });

  it('should dequeue operations the server already applied', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'facility.create', { name: 'Building A', type: 'building' }),
    ]);
    mockFacilities.createForMission.mockReturnValue(
      throwError(() => ({
        status: 409,
        error: { type: '/problems/client-resource-already-exists' },
      })),
    );

    const replayed = await service.replayOutbox('org-1', 'mission-1');

    expect(replayed).toBe(1);
    expect(mockOffline.removeOutbox).toHaveBeenCalledWith('op-1');
  });

  it('should stop the replay and keep the operation queued on other failures', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'facility.create', { name: 'Building A', type: 'building' }),
      operation('op-2', 'equipment.create', { type: 'fire_extinguisher' }),
    ]);
    mockFacilities.createForMission.mockReturnValue(throwError(() => ({ status: 500 })));

    await expect(service.replayOutbox('org-1', 'mission-1')).rejects.toBeTruthy();

    expect(mockOffline.removeOutbox).not.toHaveBeenCalled();
    expect(mockEquipment.createForMission).not.toHaveBeenCalled();
  });

  it('should mark permanently rejected operations as failed and continue', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'facility.create', { name: 'Building A', type: 'building' }),
      operation('op-2', 'equipment.create', { type: 'fire_extinguisher' }),
    ]);
    mockFacilities.createForMission.mockReturnValue(
      throwError(() => ({ status: 422, error: { detail: 'The facility is invalid.' } })),
    );

    const replayed = await service.replayOutbox('org-1', 'mission-1');

    expect(replayed).toBe(1);
    expect(mockOffline.markOutboxFailed).toHaveBeenCalledWith('op-1', 'The facility is invalid.');
    expect(mockOffline.removeOutbox).toHaveBeenCalledWith('op-2');
  });

  it('should serialize concurrent replay requests for the same mission', async () => {
    let resolveList:
      | ((operations: readonly MissionOutboxOperationFor<'facility.create'>[]) => void)
      | undefined;
    mockOffline.listOutbox.mockReturnValue(
      new Promise((resolve) => {
        resolveList = resolve;
      }),
    );

    const first = service.replayOutbox('org-1', 'mission-1');
    const second = service.replayOutbox('org-1', 'mission-1');
    resolveList?.([operation('op-1', 'facility.create', { name: 'Building A', type: 'building' })]);

    await expect(Promise.all([first, second])).resolves.toEqual([1, 1]);
    expect(mockOffline.listOutbox).toHaveBeenCalledOnce();
    expect(mockFacilities.createForMission).toHaveBeenCalledOnce();
  });

  it('should suspend only the stale operation and continue replaying the outbox', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'mission.update', { status: 'in_progress', revision: 3 }),
      operation('op-2', 'equipment.create', { type: 'fire_extinguisher' }),
    ]);
    mockMissionService.update.mockReturnValue(
      throwError(() => ({ status: 412, error: { detail: 'The mission changed.' } })),
    );

    const replayed = await service.replayOutbox('org-1', 'mission-1');

    expect(replayed).toBe(1);
    expect(mockOffline.markOutboxConflict).toHaveBeenCalledWith('op-1', 'The mission changed.');
    expect(mockOffline.removeOutbox).toHaveBeenCalledWith('op-2');
    expect(mockEquipment.createForMission).toHaveBeenCalled();
  });

  it('should treat an existing client UUID creation as already synchronized', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'equipment.create', {
        clientId: 'equipment-client-id',
        type: 'fire_extinguisher',
      }),
    ]);
    mockEquipment.createForMission.mockReturnValue(
      throwError(() => ({
        status: 412,
        error: { type: '/problems/client-resource-already-exists' },
      })),
    );

    const replayed = await service.replayOutbox('org-1', 'mission-1');

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
    mockEquipment.createForMission.mockReturnValue(
      throwError(() => ({ status: 412, error: { detail: 'The mission changed.' } })),
    );

    const replayed = await service.replayOutbox('org-1', 'mission-1');

    expect(replayed).toBe(0);
    expect(mockOffline.markOutboxConflict).toHaveBeenCalledWith('op-1', 'The mission changed.');
    expect(mockOffline.removeOutbox).not.toHaveBeenCalled();
  });

  it('should leave operations depending on a conflicted resource pending', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'equipment.create', {
        clientId: 'equipment-client-id',
        type: 'fire_extinguisher',
      }),
      operation('op-2', 'work-item.create', {
        clientId: 'work-item-client-id',
        mission: '/api/missions/mission-1',
        action: 'inventory',
        target: '/api/equipment/equipment-client-id',
        source: 'discovered',
        required: false,
      }),
    ]);
    mockEquipment.createForMission.mockReturnValue(
      throwError(() => ({ status: 412, error: { detail: 'The mission changed.' } })),
    );

    const replayed = await service.replayOutbox('org-1', 'mission-1');

    expect(replayed).toBe(0);
    expect(mockOffline.markOutboxConflict).toHaveBeenCalledWith('op-1', 'The mission changed.');
    expect(mockMissionService.createWorkItem).not.toHaveBeenCalled();
    expect(mockOffline.removeOutbox).not.toHaveBeenCalled();
  });

  it('should reject malformed media operations', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'media.create', {
        equipmentId: 'equipment-1',
      } as unknown as MissionOutboxPayloadMap['media.create']),
    ]);

    await expect(service.replayOutbox('org-1', 'mission-1')).resolves.toBe(0);
    expect(mockOffline.markOutboxFailed).toHaveBeenCalledWith(
      'op-1',
      'Invalid offline media operation',
    );
    expect(mockOffline.removeOutbox).not.toHaveBeenCalled();
  });
});
