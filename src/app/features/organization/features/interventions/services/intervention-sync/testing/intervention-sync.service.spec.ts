import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { CreateFacilityInput } from '@features/organization/features/facilities/models';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import {
  InterventionOfflineService,
  InterventionService,
  InterventionTimeService,
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
    createChange: ReturnType<typeof vi.fn>;
    updateChange: ReturnType<typeof vi.fn>;
    uploadAttachment: ReturnType<typeof vi.fn>;
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
      createChange: vi.fn().mockReturnValue(of({})),
      updateChange: vi.fn().mockReturnValue(of({})),
      uploadAttachment: vi.fn().mockReturnValue(of({})),
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
        {
          provide: InterventionTimeService,
          useValue: {
            journal: vi.fn().mockReturnValue(of({ entries: [] })),
            createEntry: vi.fn().mockReturnValue(of({})),
            correctEntry: vi.fn().mockReturnValue(of({})),
            cancelEntry: vi.fn().mockReturnValue(of(undefined)),
          },
        },
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

  it('replays a time journal creation, correction and cancellation in entry order', async () => {
    const time = TestBed.inject(InterventionTimeService);
    const dispatch = vi.spyOn(TestBed.inject(Dispatcher), 'dispatch');
    const entry = {
      id: 'entry-1',
      workItemId: 'work-1',
      actorId: 'member-1',
      memberId: 'member-1',
      workedOn: '2026-09-16',
      minutes: 60,
      note: null,
    };
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-create', 'time-entry.create', entry),
      operation('op-correct', 'time-entry.correct', { ...entry, minutes: 90, revision: 1 }),
      operation('op-cancel', 'time-entry.cancel', {
        id: entry.id,
        workItemId: entry.workItemId,
        actorId: entry.actorId,
        revision: 2,
      }),
    ]);

    expect(await service.replayOutbox('org-1', 'intervention-1')).toBe(3);
    expect(time.createEntry).toHaveBeenCalledWith('work-1', {
      id: 'entry-1',
      memberId: 'member-1',
      workedOn: '2026-09-16',
      minutes: 60,
      note: null,
    });
    expect(time.correctEntry).toHaveBeenCalledWith(
      'work-1',
      { id: 'entry-1', memberId: 'member-1', workedOn: '2026-09-16', minutes: 90, note: null },
      1,
    );
    expect(time.cancelEntry).toHaveBeenCalledWith('work-1', 'entry-1', 2);
    expect(mockOffline.removeOutbox.mock.calls.map(([id]) => id)).toEqual([
      'op-create',
      'op-correct',
      'op-cancel',
    ]);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          interventionId: 'intervention-1',
          source: 'replayed',
          collections: ['workItems'],
        },
      }),
    );
  });

  it('retains a time correction and the server snapshot when its journal revision is stale', async () => {
    const time = TestBed.inject(InterventionTimeService);
    vi.mocked(time.correctEntry).mockReturnValue(
      throwError(() => ({
        status: 412,
        detail: 'Time entry changed.',
      })),
    );
    vi.mocked(time.journal).mockReturnValue(
      of({
        '@id': '/api/intervention-work-items/task/time-entries',
        '@type': 'InterventionTimeJournal',
        workItemId: 'task',
        entries: [
          {
            id: 'entry',
            workItemId: 'task',
            memberId: 'member',
            workedOn: '2026-09-16',
            minutes: 90,
            note: 'Server note',
            revision: 3,
            cancelled: false,
            createdBy: 'member',
            updatedBy: 'manager',
            createdAt: '2026-09-16T09:00:00Z',
            updatedAt: '2026-09-16T10:00:00Z',
            versions: [],
          },
        ],
      }),
    );
    const input = {
      id: 'entry',
      workItemId: 'task',
      actorId: 'member',
      memberId: 'member',
      workedOn: '2026-09-16',
      minutes: 120,
      note: 'Local note',
      revision: 1,
    };
    mockOffline.listOutbox.mockResolvedValue([operation('time-op', 'time-entry.correct', input)]);
    expect(await service.replayOutbox('org-1', 'intervention-1')).toBe(0);
    expect(mockOffline.markOutboxConflict).toHaveBeenCalledWith(
      'time-op',
      'Time entry changed.',
      null,
      {
        revision: 3,
        values: {
          memberId: 'member',
          workedOn: '2026-09-16',
          minutes: 90,
          note: 'Server note',
          cancelled: false,
        },
      },
    );
    expect(mockOffline.rebaseOutboxRevision).not.toHaveBeenCalled();
    expect(mockOffline.removeOutbox).not.toHaveBeenCalled();
    expect(input.revision).toBe(1);
  });

  it('keeps rejected time visible when permission is lost before synchronization', async () => {
    const time = TestBed.inject(InterventionTimeService);
    vi.mocked(time.createEntry).mockReturnValue(
      throwError(() => ({
        status: 403,
        detail: 'Time entry permission is required.',
      })),
    );
    mockOffline.listOutbox.mockResolvedValue([
      operation('time-op', 'time-entry.create', {
        id: 'stable-entry',
        workItemId: 'task',
        actorId: 'member',
        memberId: 'member',
        workedOn: '2026-09-16',
        minutes: 120,
        note: null,
      }),
    ]);
    expect(await service.replayOutbox('org-1', 'intervention-1')).toBe(0);
    expect(mockOffline.markOutboxFailed).toHaveBeenCalledWith(
      'time-op',
      'Time entry permission is required.',
    );
    expect(mockOffline.removeOutbox).not.toHaveBeenCalled();
    expect(mockOffline.rebaseOutboxRevision).not.toHaveBeenCalled();
  });

  it('invalidates only effectively replayed collections after a partial replay', async () => {
    const dispatch = vi.spyOn(TestBed.inject(Dispatcher), 'dispatch');
    mockOffline.listOutbox.mockResolvedValue([
      operation('work', 'work-item.update', { workItemId: 'work-1', status: 'completed' }),
      operation('change', 'change.update', { changeId: 'change-1', status: 'rejected' }),
    ]);
    mockInterventionService.updateChange.mockReturnValue(throwError(() => ({ status: 422 })));
    expect(await service.replayOutbox('org-1', 'intervention-1')).toBe(1);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          interventionId: 'intervention-1',
          source: 'replayed',
          collections: ['workItems', 'changes'],
        },
      }),
    );
    expect(mockOffline.removeOutbox).toHaveBeenCalledTimes(1);
    expect(mockOffline.markOutboxFailed).toHaveBeenCalledWith('change', expect.any(String));
  });

  it('announces a successful status replay even when a later operation loses connectivity', async () => {
    const dispatch = vi.spyOn(TestBed.inject(Dispatcher), 'dispatch');
    mockOffline.listOutbox.mockResolvedValue([
      operation('status', 'intervention.update', { status: 'in_progress' }),
      operation('change', 'change.update', { changeId: 'change-1', status: 'rejected' }),
    ]);
    mockInterventionService.updateChange.mockReturnValue(throwError(() => ({ status: 0 })));
    await expect(service.replayOutbox('org-1', 'intervention-1')).rejects.toBeDefined();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          collections: expect.arrayContaining(['activity']),
          source: 'replayed',
        }),
      }),
    );
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

  it('should replay a queued attachment upload without any idempotency key', async () => {
    const file = new Blob(['photo'], { type: 'image/jpeg' });
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'attachment.upload', {
        clientId: 'client-1',
        file,
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        size: 5,
        label: 'Extinguisher',
        workItemId: 'work-item-1',
      }),
    ]);

    await service.replayOutbox('org-1', 'intervention-1');

    expect(mockInterventionService.uploadAttachment).toHaveBeenCalledWith(
      'intervention-1',
      file,
      'photo.jpg',
      'Extinguisher',
      'work-item-1',
      undefined,
      'client-1',
    );
    expect(mockOffline.removeOutbox).toHaveBeenCalledWith('op-1');
  });

  it('should reject a malformed attachment operation', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'attachment.upload', {
        file: 'not-a-blob',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        size: 5,
      } as unknown as InterventionOutboxPayloadMap['attachment.upload']),
    ]);

    await service.replayOutbox('org-1', 'intervention-1');

    expect(mockInterventionService.uploadAttachment).not.toHaveBeenCalled();
    expect(mockOffline.markOutboxFailed).toHaveBeenCalledWith(
      'op-1',
      'Invalid offline attachment operation',
    );
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

  it('allows a fresh replay after an aborted pass when connectivity returns', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'facility.create', { name: 'Building A', type: 'building' }),
    ]);
    mockFacilities.createForIntervention.mockReturnValueOnce(throwError(() => ({ status: 0 })));

    await expect(service.replayOutbox('org-1', 'intervention-1')).rejects.toEqual({ status: 0 });
    expect(mockOffline.removeOutbox).not.toHaveBeenCalled();

    expect(await service.replayOutbox('org-1', 'intervention-1')).toBe(1);
    expect(mockOffline.listOutbox).toHaveBeenCalledTimes(2);
    expect(mockOffline.removeOutbox).toHaveBeenCalledWith('op-1');
  });

  it('preserves a stale planning revision for explicit comparison while independent operations replay', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'intervention.update', { status: 'in_progress', revision: 3 }),
      operation('op-2', 'equipment.create', { type: 'fire_extinguisher' }),
    ]);
    mockInterventionService.update.mockReturnValue(
      throwError(() => ({ status: 412, error: { detail: 'The intervention changed.' } })),
    );
    mockInterventionService.get.mockReturnValue(of({ revision: 7, status: 'planned' }));

    const replayed = await service.replayOutbox('org-1', 'intervention-1');

    expect(replayed).toBe(1);
    expect(mockInterventionService.get).toHaveBeenCalledWith('intervention-1');
    expect(mockOffline.markOutboxConflict).toHaveBeenCalledWith(
      'op-1',
      'The intervention changed.',
      null,
      {
        revision: 7,
        values: { status: 'planned', plannedStartAt: null, dueAt: null, responsible: null },
      },
    );
    expect(mockOffline.rebaseOutboxRevision).not.toHaveBeenCalled();
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

  it('rebases a stale non-planning change against the latest server revision', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'change.update', {
        changeId: 'change-1',
        status: 'rejected',
        revision: 2,
      }),
    ]);
    mockInterventionService.updateChange.mockReturnValue(
      throwError(() => ({ status: 412, detail: 'The change was updated.' })),
    );
    mockInterventionService.listAllChanges.mockReturnValue(of([{ id: 'change-1', revision: 8 }]));

    expect(await service.replayOutbox('org-1', 'intervention-1')).toBe(0);
    expect(mockOffline.rebaseOutboxRevision).toHaveBeenCalledWith(
      'op-1',
      8,
      'The change was updated.',
    );
    expect(mockOffline.markOutboxConflict).not.toHaveBeenCalled();
    expect(mockOffline.removeOutbox).not.toHaveBeenCalled();
  });

  it('rebases a stale description change without discarding the queued intention', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'intervention.update', { description: 'Local field notes', revision: 2 }),
    ]);
    mockInterventionService.update.mockReturnValue(
      throwError(() => ({ status: 412, detail: 'The intervention changed.' })),
    );
    mockInterventionService.get.mockReturnValue(of({ revision: 9 }));

    expect(await service.replayOutbox('org-1', 'intervention-1')).toBe(0);
    expect(mockOffline.rebaseOutboxRevision).toHaveBeenCalledWith(
      'op-1',
      9,
      'The intervention changed.',
    );
    expect(mockOffline.removeOutbox).not.toHaveBeenCalled();
  });

  it('rebases a stale work-item status when its server revision can be read', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'work-item.update', {
        workItemId: 'work-1',
        status: 'completed',
        revision: 2,
      }),
    ]);
    mockInterventionService.updateWorkItem.mockReturnValue(
      throwError(() => ({ status: 412, detail: 'The work item changed.' })),
    );
    mockInterventionService.listAllWorkItems.mockReturnValue(of([{ id: 'work-1', revision: 7 }]));

    expect(await service.replayOutbox('org-1', 'intervention-1')).toBe(0);
    expect(mockOffline.rebaseOutboxRevision).toHaveBeenCalledWith(
      'op-1',
      7,
      'The work item changed.',
    );
    expect(mockOffline.removeOutbox).not.toHaveBeenCalled();
  });

  it('keeps a stale work-item assignment and the server values for human review', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'work-item.update', {
        workItemId: 'work-1',
        assignee: '/api/organization-members/member-1',
        revision: 2,
      }),
    ]);
    mockInterventionService.updateWorkItem.mockReturnValue(
      throwError(() => ({ status: 412, detail: 'The task assignment changed.' })),
    );
    mockInterventionService.listAllWorkItems.mockReturnValue(
      of([
        {
          id: 'work-1',
          revision: 5,
          assignee: '/api/organization-members/member-2',
          status: 'in_progress',
          estimatedMinutes: 120,
          remainingMinutes: 45,
          workStartsOn: '2026-09-16',
          workEndsOn: '2026-09-17',
        },
      ]),
    );

    expect(await service.replayOutbox('org-1', 'intervention-1')).toBe(0);
    expect(mockOffline.markOutboxConflict).toHaveBeenCalledWith(
      'op-1',
      'The task assignment changed.',
      null,
      {
        revision: 5,
        values: {
          assignee: '/api/organization-members/member-2',
          status: 'in_progress',
          estimatedMinutes: 120,
          remainingMinutes: 45,
          workStartsOn: '2026-09-16',
          workEndsOn: '2026-09-17',
        },
      },
    );
    expect(mockOffline.rebaseOutboxRevision).not.toHaveBeenCalled();
    expect(mockOffline.removeOutbox).not.toHaveBeenCalled();
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

  it('keeps a stored conflict blocked across replay cycles while independent work proceeds', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      {
        ...operation('op-parent', 'equipment.create', {
          clientId: 'equipment-client-id',
          type: 'fire_extinguisher',
        }),
        status: 'conflict',
      },
      operation('op-dependent', 'work-item.create', {
        clientId: 'work-item-client-id',
        intervention: '/api/interventions/intervention-1',
        action: 'inventory',
        target: '/api/equipment/equipment-client-id',
        source: 'discovered',
        required: false,
      }),
      operation('op-independent', 'comment.create', { body: 'Independent field note' }),
    ]);

    expect(await service.replayOutbox('org-1', 'intervention-1')).toBe(1);
    expect(mockEquipment.createForIntervention).not.toHaveBeenCalled();
    expect(mockInterventionService.createWorkItem).not.toHaveBeenCalled();
    expect(mockOffline.markOutboxFailed).toHaveBeenCalledWith(
      'op-dependent',
      expect.stringContaining('depends on'),
    );
    expect(mockOffline.removeOutbox).toHaveBeenCalledExactlyOnceWith('op-independent');
  });

  it('preserves the overload assessment and blocks work depending on the conflicted task', async () => {
    const assessment = {
      confirmationRequired: true,
      confirmationToken: 'confirmation-token',
      completeness: 'partial',
      increases: [
        {
          memberId: 'member-1',
          memberName: 'Alex',
          date: '2026-09-16',
          reason: 'daily_overload',
          beforeMinutes: 0,
          afterMinutes: 60,
          capacityMinutes: 420,
        },
      ],
    };
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-assignment', 'work-item.update', {
        workItemId: 'work-1',
        assignee: '/api/organization-members/member-1',
        revision: 2,
      }),
      operation('op-time', 'time-entry.create', {
        id: 'entry-1',
        workItemId: 'work-1',
        actorId: 'member-1',
        memberId: 'member-1',
        workedOn: '2026-09-16',
        minutes: 30,
        note: null,
      }),
    ]);
    mockInterventionService.updateWorkItem.mockReturnValue(
      throwError(() => ({
        status: 409,
        error: { detail: 'Capacity confirmation required', assessment },
      })),
    );
    const time = TestBed.inject(InterventionTimeService);

    expect(await service.replayOutbox('org-1', 'intervention-1')).toBe(0);
    expect(mockOffline.markOutboxConflict).toHaveBeenCalledWith(
      'op-assignment',
      'Capacity confirmation required',
      assessment,
    );
    expect(mockOffline.markOutboxFailed).toHaveBeenCalledWith(
      'op-time',
      expect.stringContaining('depends on'),
    );
    expect(time.createEntry).not.toHaveBeenCalled();
    expect(mockOffline.removeOutbox).not.toHaveBeenCalled();
  });

  it('detects a blocked facility inside a nested change patch while replaying independent work', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-facility', 'facility.create', {
        clientId: 'facility-client-id',
        name: 'Building A',
        type: 'building',
      }),
      operation('op-change', 'change.create', {
        intervention: '/api/interventions/intervention-1',
        resource: '/api/interventions/intervention-1',
        patch: { linkedFacilities: [{ facility: ['/api/facilities/facility-client-id'] }] },
      }),
      operation('op-work', 'work-item.create', {
        clientId: 'work-item-client-id',
        intervention: '/api/interventions/intervention-1',
        action: 'inventory',
        target: '/api/equipment/equipment-1',
        source: 'discovered',
        required: false,
      }),
    ]);
    mockFacilities.createForIntervention.mockReturnValue(
      throwError(() => ({ status: 422, detail: 'The facility is invalid.' })),
    );

    expect(await service.replayOutbox('org-1', 'intervention-1')).toBe(1);
    expect(mockOffline.markOutboxFailed).toHaveBeenCalledWith(
      'op-facility',
      'The facility is invalid.',
    );
    expect(mockOffline.markOutboxFailed).toHaveBeenCalledWith(
      'op-change',
      expect.stringContaining('depends on'),
    );
    expect(mockInterventionService.createChange).not.toHaveBeenCalled();
    expect(mockInterventionService.createWorkItem).toHaveBeenCalledOnce();
    expect(mockOffline.removeOutbox).toHaveBeenCalledExactlyOnceWith('op-work');
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
    // The queued `clientId` must travel with the replay: a response lost in the
    // field is indistinguishable, from the device, from a request that never
    // arrived, so without the key a retry appends a second comment.
    expect(mockInterventionService.addComment).toHaveBeenCalledWith(
      'intervention-1',
      'Checked the extinguisher on site.',
      'comment-client-id',
    );
    expect(mockOffline.removeOutbox).toHaveBeenCalledWith('op-1');
  });

  it('should replay an inspection creation', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'inspection.create', {
        clientId: 'inspection-client-id',
        equipmentId: 'equipment-1',
        result: 'pass',
        performedAt: '2026-07-01T10:00:00.000Z',
        inspectorType: 'user',
        inspectorName: 'Jane Doe',
      }),
    ]);

    const replayed = await service.replayOutbox('org-1', 'intervention-1');

    expect(replayed).toBe(1);
    expect(mockInspections.createForIntervention).toHaveBeenCalledWith(
      'org-1',
      'intervention-1',
      expect.objectContaining({ clientId: 'inspection-client-id' }),
    );
    expect(mockOffline.removeOutbox).toHaveBeenCalledWith('op-1');
  });

  it('should replay a queued work-item update', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'work-item.update', {
        workItemId: 'work-item-1',
        status: 'completed',
        revision: 2,
      }),
    ]);

    const replayed = await service.replayOutbox('org-1', 'intervention-1');

    expect(replayed).toBe(1);
    expect(mockInterventionService.updateWorkItem).toHaveBeenCalledWith(
      'work-item-1',
      expect.objectContaining({ status: 'completed' }),
      2,
    );
    expect(mockOffline.removeOutbox).toHaveBeenCalledWith('op-1');
  });

  it('should replay a queued intervention change creation', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'change.create', {
        clientId: 'change-client-id',
        intervention: '/api/interventions/intervention-1',
        resource: '/api/equipment/equipment-1',
        patch: { status: 'replaced' },
      }),
    ]);

    const replayed = await service.replayOutbox('org-1', 'intervention-1');

    expect(replayed).toBe(1);
    expect(mockInterventionService.createChange).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 'change-client-id' }),
    );
    expect(mockOffline.removeOutbox).toHaveBeenCalledWith('op-1');
  });

  it('should replay a queued intervention change update', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'change.update', {
        changeId: 'change-1',
        revision: 3,
        patch: { status: 'accepted' },
      }),
    ]);

    const replayed = await service.replayOutbox('org-1', 'intervention-1');

    expect(replayed).toBe(1);
    expect(mockInterventionService.updateChange).toHaveBeenCalledWith(
      'change-1',
      expect.objectContaining({ patch: { status: 'accepted' } }),
      3,
    );
    expect(mockOffline.removeOutbox).toHaveBeenCalledWith('op-1');
  });

  it('should replay an intervention detail update and rehydrate ISO dates', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'intervention.update', {
        revision: 2,
        plannedStartAt: '2026-07-01T10:00:00.000Z',
        dueAt: null,
      }),
    ]);

    const replayed = await service.replayOutbox('org-1', 'intervention-1');

    expect(replayed).toBe(1);
    expect(mockInterventionService.update).toHaveBeenCalledWith(
      'intervention-1',
      expect.objectContaining({
        plannedStartAt: new Date('2026-07-01T10:00:00.000Z'),
        dueAt: null,
      }),
      2,
    );
    expect(mockOffline.removeOutbox).toHaveBeenCalledWith('op-1');
  });

  it('should rethrow and stop replay on a non-Error, non-HTTP failure', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-1', 'facility.create', { name: 'Building A', type: 'building' }),
      operation('op-2', 'equipment.create', { type: 'fire_extinguisher' }),
    ]);
    mockFacilities.createForIntervention.mockReturnValue(throwError(() => 'not an error object'));

    await expect(service.replayOutbox('org-1', 'intervention-1')).rejects.toBe(
      'not an error object',
    );
    // Aborts the whole replay pass rather than continuing to the next operation.
    expect(mockEquipment.createForIntervention).not.toHaveBeenCalled();
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

  it('marks corrupted queued comments and update targets as failed without sending them', async () => {
    mockOffline.listOutbox.mockResolvedValue([
      operation('op-comment', 'comment.create', {
        body: 42,
      } as unknown as InterventionOutboxPayloadMap['comment.create']),
      operation('op-work', 'work-item.update', {
        status: 'completed',
      } as InterventionOutboxPayloadMap['work-item.update']),
      operation('op-change', 'change.update', {
        status: 'rejected',
      } as InterventionOutboxPayloadMap['change.update']),
    ]);

    expect(await service.replayOutbox('org-1', 'intervention-1')).toBe(0);
    expect(mockOffline.markOutboxFailed.mock.calls).toEqual([
      ['op-comment', 'Invalid offline comment operation'],
      ['op-work', 'Invalid work item operation'],
      ['op-change', 'Invalid intervention change operation'],
    ]);
    expect(mockInterventionService.addComment).not.toHaveBeenCalled();
    expect(mockInterventionService.updateWorkItem).not.toHaveBeenCalled();
    expect(mockInterventionService.updateChange).not.toHaveBeenCalled();
    expect(mockOffline.removeOutbox).not.toHaveBeenCalled();
  });
});
