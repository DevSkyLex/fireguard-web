import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import {
  InterventionOfflineService,
  InterventionService,
} from '@features/organization/features/interventions/data-access';
import type {
  InterventionActivityOutput,
  InterventionChangeOutput,
  InterventionIssueOutput,
  InterventionOutput,
  InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';
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
    removeWorkItem: ReturnType<typeof vi.fn>;
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
      removeWorkItem: vi.fn().mockReturnValue(of(undefined)),
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

  it('appends the created work item and bumps counters online without a full reload', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(store.intervention()?.id).toBe('intervention-1'));

    const created = {
      ...workItem,
      id: 'work-item-2',
      target: '/api/equipment/equipment-2',
    } as InterventionWorkItemOutput;
    mockService.createWorkItem.mockReturnValue(of(created));
    mockService.get.mockClear();
    mockService.listAllWorkItems.mockClear();

    store.createWorkItem({
      interventionId: intervention.id,
      input: {
        intervention: intervention['@id'],
        action: 'inventory',
        target: '/api/equipment/equipment-2',
        source: 'planned',
        required: true,
      },
    });

    await vi.waitFor(() => expect(store.saving()).toBe(false));

    expect(mockService.createWorkItem).toHaveBeenCalled();
    // No full workspace reload: the intervention and work item lists are not refetched.
    expect(mockService.get).not.toHaveBeenCalled();
    expect(mockService.listAllWorkItems).not.toHaveBeenCalled();
    expect(store.workItems()).toHaveLength(2);
    expect(store.workItems().at(-1)).toMatchObject({ id: 'work-item-2' });
    expect(store.intervention()?.workItemsCount).toBe(2);
    expect(store.intervention()?.revision).toBe(4);
  });

  it('deletes work items online, decrements counters and avoids a full reload', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(store.intervention()?.id).toBe('intervention-1'));

    mockService.get.mockClear();
    mockService.listAllWorkItems.mockClear();

    store.deleteWorkItems({ interventionId: intervention.id, workItems: [workItem] });

    await vi.waitFor(() => expect(store.saving()).toBe(false));

    expect(mockService.removeWorkItem).toHaveBeenCalledWith('work-item-1', 1);
    // No full workspace reload after a delete.
    expect(mockService.get).not.toHaveBeenCalled();
    expect(mockService.listAllWorkItems).not.toHaveBeenCalled();
    expect(store.workItems()).toHaveLength(0);
    expect(store.intervention()?.workItemsCount).toBe(0);
    expect(store.intervention()?.revision).toBe(4);
    expect(store.error()).toBeNull();
  });

  it('refuses to delete work items offline and surfaces a connectivity message', async () => {
    store.deleteWorkItems({ interventionId: intervention.id, workItems: [workItem] });

    await vi.waitFor(() => expect(store.saving()).toBe(false));

    expect(mockService.removeWorkItem).not.toHaveBeenCalled();
    expect(store.workItems()).toHaveLength(1);
    expect(store.error()).toBe('Connect to the network to delete planned work items.');
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

describe('InterventionWorkspaceStore activity timeline', () => {
  let store: InstanceType<typeof InterventionWorkspaceStore>;
  let mockService: {
    get: ReturnType<typeof vi.fn>;
    listAllWorkItems: ReturnType<typeof vi.fn>;
    listAllChanges: ReturnType<typeof vi.fn>;
    listIssues: ReturnType<typeof vi.fn>;
    listActivities: ReturnType<typeof vi.fn>;
    addComment: ReturnType<typeof vi.fn>;
  };
  let mockOffline: {
    getWorkspace: ReturnType<typeof vi.fn>;
    saveWorkspace: ReturnType<typeof vi.fn>;
    queue: ReturnType<typeof vi.fn>;
  };
  let dispatch: ReturnType<typeof vi.fn>;

  const comment = {
    '@id': '/api/intervention-activities/activity-1',
    '@type': 'InterventionActivity',
    id: 'activity-1',
    intervention: '/api/interventions/intervention-1',
    kind: 'comment',
    event: 'comment',
    actor: '/api/organizations/org-1/members/member-1',
    body: 'Looks good',
    payload: null,
    createdAt: '2026-07-01T00:00:00.000Z',
  } as InterventionActivityOutput;

  beforeEach(() => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    mockService = {
      get: vi.fn().mockReturnValue(of(intervention)),
      listAllWorkItems: vi.fn().mockReturnValue(of([])),
      listAllChanges: vi.fn().mockReturnValue(of([])),
      listIssues: vi.fn().mockReturnValue(
        of({
          '@id': '/api/interventions/intervention-1/issues',
          '@type': 'Collection',
          totalItems: 0,
          member: [],
        }),
      ),
      listActivities: vi.fn().mockReturnValue(
        of({
          '@id': '/api/interventions/intervention-1/activities',
          '@type': 'Collection',
          totalItems: 1,
          member: [comment],
        }),
      ),
      addComment: vi.fn().mockReturnValue(of(comment)),
    };
    mockOffline = {
      getWorkspace: vi.fn(),
      saveWorkspace: vi.fn().mockResolvedValue(undefined),
      queue: vi.fn().mockResolvedValue(undefined),
    };
    dispatch = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        InterventionWorkspaceStore,
        { provide: InterventionService, useValue: mockService },
        { provide: InterventionOfflineService, useValue: mockOffline },
        { provide: Dispatcher, useValue: { dispatch } },
      ],
    });

    store = TestBed.inject(InterventionWorkspaceStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads the activity timeline', () => {
    store.loadActivities('intervention-1');

    expect(mockService.listActivities).toHaveBeenCalledWith('intervention-1');
    expect(store.activities()).toEqual([comment]);
    expect(store.activityCallState().status).toBe('success');
  });

  it('keeps the in-memory snapshot on a network failure and reports success', () => {
    store.loadActivities('intervention-1');
    mockService.listActivities.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );

    store.loadActivities('intervention-1');

    expect(store.activities()).toEqual([comment]);
    expect(store.activityCallState().status).toBe('success');
  });

  it('surfaces the error when there is no snapshot to fall back to', () => {
    mockService.listActivities.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    store.loadActivities('intervention-1');

    expect(store.activities()).toEqual([]);
    expect(store.activityCallState().status).toBe('error');
  });

  it('appends the returned comment to the timeline on success', () => {
    store.addComment({ interventionId: 'intervention-1', body: 'Looks good' });

    expect(mockService.addComment).toHaveBeenCalledWith('intervention-1', 'Looks good');
    expect(store.activities()).toEqual([comment]);
    expect(store.saving()).toBe(false);
  });

  it('dispatches a failure event and leaves the timeline untouched on error', () => {
    mockService.addComment.mockReturnValue(throwError(() => new Error('network')));

    store.addComment({ interventionId: 'intervention-1', body: 'Looks good' });

    expect(store.activities()).toEqual([]);
    expect(store.saving()).toBe(false);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0][0]).toMatchObject({
      type: '[Intervention Workspace Store] commentAddFailed',
    });
  });

  it('refuses to post a comment while offline and dispatches a failure event', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    window.dispatchEvent(new Event('offline'));

    store.addComment({ interventionId: 'intervention-1', body: 'Looks good' });

    expect(mockService.addComment).not.toHaveBeenCalled();
    expect(store.activities()).toEqual([]);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0][0]).toMatchObject({
      type: '[Intervention Workspace Store] commentAddFailed',
    });
  });
});
