import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionChangeOutput,
  InterventionIssueOutput,
  InterventionOutput,
  InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';
import { InterventionOfflineService } from '@features/organization/features/interventions/services';
import { InterventionWorkspaceStore } from '../intervention-workspace.store';

const intervention = {
  '@id': '/api/interventions/intervention-1',
  '@type': 'Intervention',
  id: 'intervention-1',
  status: 'planned',
  revision: 3,
  workItemsCount: 1,
  completedWorkItemsCount: 0,
  updatedAt: '2026-06-12T08:00:00.000Z',
} as InterventionOutput;

const workItem = {
  '@id': '/api/intervention-work-items/work-item-1',
  '@type': 'InterventionWorkItem',
  id: 'work-item-1',
  intervention: '/api/interventions/intervention-1',
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
} as InterventionWorkItemOutput;

describe('InterventionWorkspaceStore offline field work', () => {
  let store: InstanceType<typeof InterventionWorkspaceStore>;
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
      get: vi.fn().mockReturnValue(of(intervention)),
      listAllWorkItems: vi.fn().mockReturnValue(of([workItem])),
      listAllChanges: vi.fn().mockReturnValue(of([] as readonly InterventionChangeOutput[])),
      listIssues: vi.fn().mockReturnValue(
        of({
          '@id': '/api/interventions/intervention-1/issues',
          '@type': 'Collection',
          totalItems: 0,
          member: [] as readonly InterventionIssueOutput[],
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
        InterventionWorkspaceStore,
        { provide: InterventionService, useValue: mockService },
        { provide: InterventionOfflineService, useValue: mockOffline },
      ],
    });

    store = TestBed.inject(InterventionWorkspaceStore);
    store.load('intervention-1');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts the intervention and persists the optimistic revision when field work begins offline', async () => {
    store.setWorkItemStatus({
      interventionId: intervention.id,
      workItemId: workItem.id,
      status: 'in_progress',
    });

    await vi.waitFor(() => expect(store.saving()).toBe(false));

    expect(mockOffline.queue).toHaveBeenCalledWith(intervention.id, 'work-item.update', {
      workItemId: workItem.id,
      status: 'in_progress',
      skipReason: null,
      revision: 1,
    });
    expect(store.intervention()?.status).toBe('in_progress');
    expect(store.intervention()?.revision).toBe(4);
    expect(store.workItems()[0]?.revision).toBe(2);
    expect(mockOffline.saveWorkspace).toHaveBeenCalled();
  });

  it('creates and persists a discovered work item with its stable client UUID offline', async () => {
    store.createWorkItem({
      interventionId: intervention.id,
      input: {
        clientId: 'discovery-client-id',
        intervention: intervention['@id'],
        action: 'inventory',
        target: '/api/equipment/equipment-2',
        source: 'discovered',
        required: false,
      },
    });

    await vi.waitFor(() => expect(store.saving()).toBe(false));

    expect(mockOffline.queue).toHaveBeenCalledWith(intervention.id, 'work-item.create', {
      clientId: 'discovery-client-id',
      intervention: intervention['@id'],
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
    expect(store.intervention()?.revision).toBe(4);
    expect(store.intervention()?.workItemsCount).toBe(2);
    expect(mockOffline.saveWorkspace).toHaveBeenCalled();
  });

  it('mirrors intervention revision changes caused by queued resources', async () => {
    await store.touchOfflineIntervention();

    expect(store.intervention()?.revision).toBe(4);
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
      intervention: intervention['@id'],
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
    expect(store.intervention()?.revision).toBe(5);
    expect(store.intervention()?.workItemsCount).toBe(2);
  });

  it('does not expose cached intervention data after an authorization failure', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    window.dispatchEvent(new Event('online'));
    mockService.get.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403, statusText: 'Forbidden' })),
    );

    store.load('intervention-1');

    await vi.waitFor(() => expect(store.loading()).toBe(false));

    expect(mockOffline.getWorkspace).not.toHaveBeenCalled();
    expect(store.error()).toBe('The intervention workspace could not be loaded.');
    expect(store.intervention()).toBeNull();
    expect(store.workItems()).toEqual([]);
    expect(store.changes()).toEqual([]);
    expect(store.issues()).toEqual([]);
  });

  it('reverses offline completion progress and clears stale skip reasons', async () => {
    store.setWorkItemStatus({
      interventionId: intervention.id,
      workItemId: workItem.id,
      status: 'skipped',
      skipReason: 'No access',
    });
    await vi.waitFor(() => expect(store.saving()).toBe(false));

    expect(store.intervention()?.completedWorkItemsCount).toBe(1);
    expect(store.workItems()[0]?.skipReason).toBe('No access');

    store.setWorkItemStatus({
      interventionId: intervention.id,
      workItemId: workItem.id,
      status: 'in_progress',
    });
    await vi.waitFor(() => expect(store.saving()).toBe(false));

    expect(store.intervention()?.completedWorkItemsCount).toBe(0);
    expect(store.workItems()[0]?.skipReason).toBeNull();
  });
});
