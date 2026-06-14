import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MissionService } from '@features/organization/features/missions/data-access';
import type {
  MissionChangeOutput,
  MissionIssueOutput,
  MissionOutput,
  MissionWorkItemOutput,
} from '@features/organization/features/missions/models';
import { MissionOfflineService } from '@features/organization/features/missions/services';
import { MissionWorkspaceStore } from '../mission-workspace.store';

const mission = {
  '@id': '/api/missions/mission-1',
  '@type': 'Mission',
  id: 'mission-1',
  status: 'planned',
  revision: 3,
  workItemsCount: 1,
  completedWorkItemsCount: 0,
  updatedAt: '2026-06-12T08:00:00.000Z',
} as MissionOutput;

const workItem = {
  '@id': '/api/mission-work-items/work-item-1',
  '@type': 'MissionWorkItem',
  id: 'work-item-1',
  mission: '/api/missions/mission-1',
  action: 'inventory',
  target: '/api/equipment/equipment-1',
  resultResource: null,
  assignee: null,
  source: 'planned',
  status: 'planned',
  required: true,
  skipReason: null,
  revision: 1,
  createdAt: '2026-06-12T08:00:00.000Z',
  updatedAt: '2026-06-12T08:00:00.000Z',
} as MissionWorkItemOutput;

describe('MissionWorkspaceStore offline field work', () => {
  let store: InstanceType<typeof MissionWorkspaceStore>;
  let mockService: {
    get: ReturnType<typeof vi.fn>;
    listAllWorkItems: ReturnType<typeof vi.fn>;
    listAllChanges: ReturnType<typeof vi.fn>;
    listIssues: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    createWorkItem: ReturnType<typeof vi.fn>;
    updateWorkItem: ReturnType<typeof vi.fn>;
  };
  let mockOffline: {
    getWorkspace: ReturnType<typeof vi.fn>;
    saveWorkspace: ReturnType<typeof vi.fn>;
    queue: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    mockService = {
      get: vi.fn().mockReturnValue(of(mission)),
      listAllWorkItems: vi.fn().mockReturnValue(of([workItem])),
      listAllChanges: vi.fn().mockReturnValue(of([] as readonly MissionChangeOutput[])),
      listIssues: vi.fn().mockReturnValue(
        of({
          '@id': '/api/missions/mission-1/issues',
          '@type': 'Collection',
          totalItems: 0,
          member: [] as readonly MissionIssueOutput[],
        }),
      ),
      update: vi.fn(),
      createWorkItem: vi.fn(),
      updateWorkItem: vi.fn(),
    };
    mockOffline = {
      getWorkspace: vi.fn(),
      saveWorkspace: vi.fn().mockResolvedValue(undefined),
      queue: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        MissionWorkspaceStore,
        { provide: MissionService, useValue: mockService },
        { provide: MissionOfflineService, useValue: mockOffline },
      ],
    });

    store = TestBed.inject(MissionWorkspaceStore);
    store.load('mission-1');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts the mission and persists the optimistic revision when field work begins offline', async () => {
    store.setWorkItemStatus({
      missionId: mission.id,
      workItemId: workItem.id,
      status: 'in_progress',
    });

    await vi.waitFor(() => expect(store.saving()).toBe(false));

    expect(mockOffline.queue).toHaveBeenCalledWith(mission.id, 'work-item.update', {
      workItemId: workItem.id,
      status: 'in_progress',
      skipReason: null,
      revision: 1,
    });
    expect(store.mission()?.status).toBe('in_progress');
    expect(store.mission()?.revision).toBe(4);
    expect(store.workItems()[0]?.revision).toBe(2);
    expect(mockOffline.saveWorkspace).toHaveBeenCalled();
  });

  it('creates and persists a discovered work item with its stable client UUID offline', async () => {
    store.createWorkItem({
      missionId: mission.id,
      input: {
        clientId: 'discovery-client-id',
        mission: mission['@id'],
        action: 'inventory',
        target: '/api/equipment/equipment-2',
        source: 'discovered',
        required: false,
      },
    });

    await vi.waitFor(() => expect(store.saving()).toBe(false));

    expect(mockOffline.queue).toHaveBeenCalledWith(mission.id, 'work-item.create', {
      clientId: 'discovery-client-id',
      mission: mission['@id'],
      action: 'inventory',
      target: '/api/equipment/equipment-2',
      source: 'discovered',
      required: false,
    });
    expect(store.workItems().at(-1)).toMatchObject({
      id: 'discovery-client-id',
      source: 'discovered',
      target: '/api/equipment/equipment-2',
    });
    expect(store.mission()?.revision).toBe(4);
    expect(store.mission()?.workItemsCount).toBe(2);
    expect(mockOffline.saveWorkspace).toHaveBeenCalled();
  });

  it('mirrors mission revision changes caused by queued resources', async () => {
    await store.touchOfflineMission();

    expect(store.mission()?.revision).toBe(4);
    expect(mockOffline.saveWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ revision: 4 }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      [],
      { replace: false },
    );
  });

  it('records an already queued discovery without queuing its work item twice', async () => {
    await store.recordQueuedDiscovery({
      clientId: 'discovery-client-id',
      mission: mission['@id'],
      action: 'inventory',
      target: '/api/equipment/equipment-2',
      source: 'discovered',
      required: false,
    });

    expect(mockOffline.queue).not.toHaveBeenCalled();
    expect(store.workItems().at(-1)).toMatchObject({
      id: 'discovery-client-id',
      target: '/api/equipment/equipment-2',
    });
    expect(store.mission()?.revision).toBe(5);
    expect(store.mission()?.workItemsCount).toBe(2);
  });

  it('does not expose cached mission data after an authorization failure', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    window.dispatchEvent(new Event('online'));
    mockService.get.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403, statusText: 'Forbidden' })),
    );

    store.load('mission-1');

    await vi.waitFor(() => expect(store.loading()).toBe(false));

    expect(mockOffline.getWorkspace).not.toHaveBeenCalled();
    expect(store.error()).toBe('The mission workspace could not be loaded.');
    expect(store.mission()).toBeNull();
    expect(store.workItems()).toEqual([]);
    expect(store.changes()).toEqual([]);
    expect(store.issues()).toEqual([]);
  });

  it('reverses offline completion progress and clears stale skip reasons', async () => {
    store.setWorkItemStatus({
      missionId: mission.id,
      workItemId: workItem.id,
      status: 'skipped',
      skipReason: 'No access',
    });
    await vi.waitFor(() => expect(store.saving()).toBe(false));

    expect(store.mission()?.completedWorkItemsCount).toBe(1);
    expect(store.workItems()[0]?.skipReason).toBe('No access');

    store.setWorkItemStatus({
      missionId: mission.id,
      workItemId: workItem.id,
      status: 'in_progress',
    });
    await vi.waitFor(() => expect(store.saving()).toBe(false));

    expect(store.mission()?.completedWorkItemsCount).toBe(0);
    expect(store.workItems()[0]?.skipReason).toBeNull();
  });
});
