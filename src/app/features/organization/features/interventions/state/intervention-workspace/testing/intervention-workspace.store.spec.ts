import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import { ConnectivityService } from '@core/connectivity';
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
  evidenceCount: 0,
  revision: 1,
  createdAt: '2026-06-12T08:00:00.000Z',
  updatedAt: '2026-06-12T08:00:00.000Z',
} as InterventionWorkItemOutput;

const proposedChange = {
  '@id': '/api/intervention-changes/change-1',
  '@type': 'InterventionChange',
  id: 'change-1',
  intervention: '/api/interventions/intervention-1',
  workItem: null,
  resource: '/api/equipment/equipment-1',
  patch: { locationLabel: 'Rack B-12' },
  status: 'proposed',
  revision: 1,
  createdAt: '2026-06-12T08:00:00.000Z',
  updatedAt: '2026-06-12T08:00:00.000Z',
} as InterventionChangeOutput;

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
    remove: ReturnType<typeof vi.fn>;
  };
  let mockOffline: {
    getWorkspace: ReturnType<typeof vi.fn>;
    listOutbox: ReturnType<typeof vi.fn>;
    saveWorkspace: ReturnType<typeof vi.fn>;
    queue: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
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
      remove: vi.fn().mockReturnValue(of(undefined)),
    };
    mockOffline = {
      getWorkspace: vi.fn(),
      listOutbox: vi.fn().mockResolvedValue([]),
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
    await vi.waitFor(() => expect(store.loading()).toBe(false));
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

  it('queues a change rejection offline and applies it optimistically', async () => {
    mockService.listAllChanges.mockReturnValue(of([proposedChange]));
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.changes()).toHaveLength(1));

    store.rejectChange({ interventionId: intervention.id, changeId: proposedChange.id });
    await vi.waitFor(() => expect(store.saving()).toBe(false));

    expect(mockOffline.queue).toHaveBeenCalledWith(intervention.id, 'change.update', {
      changeId: 'change-1',
      status: 'rejected',
      revision: 1,
    });
    expect(store.changes()[0]?.status).toBe('rejected');
    expect(store.pendingChangeIds().size).toBe(0);
    expect(store.error()).toBeNull();
  });

  it('queues and persists planning detail updates while offline', async () => {
    const dueAt = new Date('2026-07-01T10:00:00.000Z');

    store.updateDetails({
      interventionId: intervention.id,
      input: { priority: 'urgent', dueAt },
    });

    await vi.waitFor(() => expect(store.saving()).toBe(false));

    expect(mockService.update).not.toHaveBeenCalled();
    expect(mockOffline.queue).toHaveBeenCalledWith(intervention.id, 'intervention.update', {
      priority: 'urgent',
      dueAt: dueAt.toISOString(),
      revision: intervention.revision,
    });
    expect(store.intervention()).toMatchObject({
      priority: 'urgent',
      dueAt: dueAt.toISOString(),
      revision: intervention.revision + 1,
    });
    expect(mockOffline.saveWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 'urgent', dueAt: dueAt.toISOString() }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      [],
      { replace: false },
    );
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

  it('deletes the intervention and dispatches a success toast', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(store.intervention()?.id).toBe('intervention-1'));

    const dispatcher = TestBed.inject(Dispatcher);
    const dispatchSpy = vi.spyOn(dispatcher, 'dispatch');

    store.delete({ interventionId: intervention.id });

    await vi.waitFor(() => expect(store.saving()).toBe(false));

    expect(mockService.remove).toHaveBeenCalledWith('intervention-1', 3);
    expect(store.error()).toBeNull();
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Intervention Workspace Store] deleteSucceeded' }),
    );
  });

  it('surfaces the 409 conflict detail when the intervention cannot be deleted', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(store.intervention()?.id).toBe('intervention-1'));

    // `HydraApiService.handleError` already unwraps a structured API error
    // before the observable errors, so the store receives the ApiError shape
    // directly (not wrapped in an `HttpErrorResponse`).
    mockService.remove.mockReturnValueOnce(
      throwError(() => ({
        '@id': '',
        '@type': 'Error',
        status: 409,
        type: 'about:blank',
        title: 'Conflict',
        detail: 'Only draft or abandoned interventions can be deleted.',
      })),
    );

    store.delete({ interventionId: intervention.id });

    await vi.waitFor(() => expect(store.saving()).toBe(false));

    expect(store.error()).toBe('Only draft or abandoned interventions can be deleted.');
  });

  it('flags a workspace served from the device snapshot, and does not re-save it', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    window.dispatchEvent(new Event('offline'));
    mockService.get.mockReturnValue(throwError(() => new ProgressEvent('error')));
    mockOffline.getWorkspace.mockResolvedValue({
      intervention,
      workItems: [workItem],
      changes: [],
      issues: [],
    });
    mockOffline.saveWorkspace.mockClear();

    store.load(intervention.id);

    await vi.waitFor(() => expect(store.loading()).toBe(false));

    expect(store.servedFromLocalCache()).toBe(true);
    expect(store.intervention()?.id).toBe(intervention.id);
    expect(mockOffline.saveWorkspace).not.toHaveBeenCalled();
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
    update: ReturnType<typeof vi.fn>;
  };
  let mockOffline: {
    getWorkspace: ReturnType<typeof vi.fn>;
    listOutbox: ReturnType<typeof vi.fn>;
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

  const newest = {
    ...comment,
    '@id': '/api/intervention-activities/activity-9',
    id: 'activity-9',
    body: 'Signed off',
    createdAt: '2026-07-09T00:00:00.000Z',
  } as InterventionActivityOutput;

  beforeEach(async () => {
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
      update: vi.fn(),
    };
    mockOffline = {
      getWorkspace: vi.fn(),
      listOutbox: vi.fn().mockResolvedValue([]),
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

  it('reads a single-page timeline in one request', () => {
    store.loadActivities('intervention-1');

    expect(mockService.listActivities).toHaveBeenCalledTimes(1);
    expect(store.activityOldestPage()).toBe(1);
    expect(store.hasOlderActivities()).toBe(false);
  });

  it('lands on the LAST page, because the API sorts createdAt ascending', () => {
    // 3 pages of 2: page 1 holds the oldest entries, so stopping there would show
    // ancient history as the whole record and make metaLine() report it as latest.
    mockService.listActivities.mockImplementation((_id: string, page?: number) =>
      of({
        '@id': '/api/interventions/intervention-1/activities',
        '@type': 'Collection',
        totalItems: 5,
        member: page === 3 ? [newest] : [comment, comment],
      }),
    );

    store.loadActivities('intervention-1');

    expect(mockService.listActivities).toHaveBeenNthCalledWith(1, 'intervention-1');
    expect(mockService.listActivities).toHaveBeenNthCalledWith(2, 'intervention-1', 3);
    expect(store.activities()).toEqual([newest]);
    expect(store.activityOldestPage()).toBe(3);
    expect(store.hasOlderActivities()).toBe(true);
  });

  it('prepends the page above the oldest one held', () => {
    // 3 entries over 2 pages of 2: page 1 is full, page 2 is the tail.
    mockService.listActivities.mockImplementation((_id: string, page?: number) =>
      of({
        '@id': '/api/interventions/intervention-1/activities',
        '@type': 'Collection',
        totalItems: 3,
        member: page === 2 ? [newest] : [comment, comment],
      }),
    );

    store.loadActivities('intervention-1');

    expect(store.activityOldestPage()).toBe(2);

    store.loadOlderActivities('intervention-1');

    expect(mockService.listActivities).toHaveBeenLastCalledWith('intervention-1', 1);
    expect(store.activities()).toEqual([comment, comment, newest]);
    expect(store.activityOldestPage()).toBe(1);
    expect(store.hasOlderActivities()).toBe(false);
  });

  it('does not walk back past page 1', () => {
    store.loadActivities('intervention-1');
    mockService.listActivities.mockClear();

    store.loadOlderActivities('intervention-1');

    expect(mockService.listActivities).not.toHaveBeenCalled();
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

  it('treats an empty first activity page as the complete timeline', () => {
    mockService.listActivities.mockReturnValueOnce(of({ totalItems: 5, member: [] }));

    store.loadActivities('intervention-1');

    expect(mockService.listActivities).toHaveBeenCalledTimes(1);
    expect(store.activities()).toEqual([]);
    expect(store.activityOldestPage()).toBe(1);
    expect(store.activityCallState().status).toBe('success');
  });

  it('keeps the current activity page when loading older history fails', () => {
    mockService.listActivities.mockImplementation((_id: string, page?: number) =>
      page === 2
        ? of({ totalItems: 3, member: [newest] })
        : of({ totalItems: 3, member: [comment, comment] }),
    );
    store.loadActivities('intervention-1');
    expect(store.activityOldestPage()).toBe(2);
    mockService.listActivities.mockReturnValueOnce(
      throwError(() => new Error('History unavailable')),
    );

    store.loadOlderActivities('intervention-1');

    expect(store.activityCallState().status).toBe('error');
    expect(store.activities()).toEqual([newest]);
    expect(store.activityOldestPage()).toBe(2);
  });

  it('invalidates activity through a typed event after a successful status transition', async () => {
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.loading()).toBe(false));
    const statusChanged = {
      ...comment,
      '@id': '/api/intervention-activities/activity-2',
      id: 'activity-2',
      kind: 'system',
      event: 'status_changed',
      actor: null,
      body: null,
      payload: { from: 'planned', to: 'in_progress' },
      createdAt: '2026-07-02T00:00:00.000Z',
    } as InterventionActivityOutput;

    store.loadActivities('intervention-1');
    mockService.update.mockReturnValue(of({ ...intervention, status: 'in_progress' }));
    mockService.listActivities.mockReturnValue(
      of({
        '@id': '/api/interventions/intervention-1/activities',
        '@type': 'Collection',
        totalItems: 1,
        member: [statusChanged],
      }),
    );

    store.transition({ interventionId: 'intervention-1', status: 'in_progress' });

    expect(mockService.listActivities).toHaveBeenLastCalledWith('intervention-1');
    expect(store.activities()).toEqual([comment]);
    expect(mockService.listActivities).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { interventionId: 'intervention-1', source: 'remote', collections: ['activity'] },
      }),
    );
  });

  it('invalidates activity through a typed event after a successful planning update', async () => {
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.loading()).toBe(false));
    const rescheduled = {
      ...comment,
      '@id': '/api/intervention-activities/activity-3',
      id: 'activity-3',
      kind: 'system',
      event: 'rescheduled',
      actor: null,
      body: null,
      payload: {
        from: {
          plannedStartAt: '2026-07-03T00:00:00.000Z',
          dueAt: '2026-07-04T00:00:00.000Z',
        },
        to: {
          plannedStartAt: '2026-07-05T00:00:00.000Z',
          dueAt: '2026-07-06T00:00:00.000Z',
        },
      },
      createdAt: '2026-07-03T00:00:00.000Z',
    } as InterventionActivityOutput;

    store.loadActivities('intervention-1');
    mockService.update.mockReturnValue(
      of({
        ...intervention,
        plannedStartAt: '2026-07-05T00:00:00.000Z',
        dueAt: '2026-07-06T00:00:00.000Z',
      }),
    );
    mockService.listActivities.mockReturnValue(
      of({
        '@id': '/api/interventions/intervention-1/activities',
        '@type': 'Collection',
        totalItems: 1,
        member: [rescheduled],
      }),
    );

    store.updateDetails({
      interventionId: 'intervention-1',
      input: {
        plannedStartAt: new Date('2026-07-05T00:00:00.000Z'),
        dueAt: new Date('2026-07-06T00:00:00.000Z'),
      },
    });

    expect(mockService.listActivities).toHaveBeenLastCalledWith('intervention-1');
    expect(store.activities()).toEqual([comment]);
    expect(mockService.listActivities).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { interventionId: 'intervention-1', source: 'remote', collections: ['activity'] },
      }),
    );
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

  it('queues the comment offline and appends it optimistically', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    window.dispatchEvent(new Event('offline'));

    store.addComment({ interventionId: 'intervention-1', body: 'On-site check done' });
    await vi.waitFor(() => expect(store.saving()).toBe(false));

    expect(mockService.addComment).not.toHaveBeenCalled();
    expect(mockOffline.queue).toHaveBeenCalledWith(
      'intervention-1',
      'comment.create',
      expect.objectContaining({ body: 'On-site check done' }),
    );
    expect(store.activities()).toHaveLength(1);
    expect(store.activities()[0]).toMatchObject({
      kind: 'comment',
      body: 'On-site check done',
      actor: null,
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('keeps the normalized error in addCommentCallState on a genuine server rejection', () => {
    mockService.addComment.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    store.addComment({ interventionId: 'intervention-1', body: 'Looks good' });

    expect(store.addCommentCallState().status).toBe('error');
    expect(store.activities()).toEqual([]);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0][0]).toMatchObject({
      type: '[Intervention Workspace Store] commentAddFailed',
    });
  });

  it('clears the previously loaded activity timeline when load() targets a different intervention', () => {
    store.loadActivities('intervention-1');
    expect(store.activities()).toEqual([comment]);
    expect(store.activityOldestPage()).toBe(1);

    mockService.listAllWorkItems.mockReturnValue(of([]));
    mockService.listAllChanges.mockReturnValue(of([]));
    store.load('intervention-2');

    expect(store.activities()).toEqual([]);
    expect(store.activityOldestPage()).toBeNull();
  });

  it('queues the comment when an online post fails on a network error', async () => {
    mockService.addComment.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

    store.addComment({ interventionId: 'intervention-1', body: 'On-site check done' });
    await vi.waitFor(() => expect(store.saving()).toBe(false));

    expect(mockOffline.queue).toHaveBeenCalledWith(
      'intervention-1',
      'comment.create',
      expect.objectContaining({ body: 'On-site check done' }),
    );
    expect(store.activities()).toHaveLength(1);
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe('InterventionWorkspaceStore call state', () => {
  let store: InstanceType<typeof InterventionWorkspaceStore>;
  let mockService: Record<string, ReturnType<typeof vi.fn>>;

  /** A 422 as API Platform reports a rejected planning update. */
  const violation = {
    '@id': '',
    '@type': 'ConstraintViolation',
    status: 422,
    type: 'https://tools.ietf.org/html/rfc4918#section-11.2',
    title: 'Unprocessable Entity',
    detail: 'dueAt: This value should be greater than plannedStartAt.',
    violations: [
      { propertyPath: 'dueAt', message: 'This value should be greater than plannedStartAt.' },
    ],
  };

  beforeEach(async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
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
      listActivities: vi.fn().mockReturnValue(
        of({
          '@id': '/api/interventions/intervention-1/activities',
          '@type': 'Collection',
          totalItems: 0,
          member: [] as readonly InterventionActivityOutput[],
        }),
      ),
      update: vi.fn(),
      createWorkItem: vi.fn(),
      updateWorkItem: vi.fn(),
      updateChange: vi.fn(),
      removeWorkItem: vi.fn().mockReturnValue(of(undefined)),
      remove: vi.fn().mockReturnValue(of(undefined)),
      assignTeam: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        InterventionWorkspaceStore,
        { provide: InterventionService, useValue: mockService },
        {
          provide: InterventionOfflineService,
          useValue: {
            getWorkspace: vi.fn(),
            listOutbox: vi.fn().mockResolvedValue([]),
            saveWorkspace: vi.fn().mockResolvedValue(undefined),
            queue: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    });

    store = TestBed.inject(InterventionWorkspaceStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('cancels an A reload when B starts loading and never applies its late result', async () => {
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.loading()).toBe(false));
    const pending = new Subject<InterventionOutput>();
    mockService['get'].mockReturnValueOnce(pending);
    store.reload('intervention-1');
    mockService['get'].mockReturnValueOnce(of({ ...intervention, id: 'B' }));
    store.load('B');
    pending.next(intervention);
    pending.complete();
    await vi.waitFor(() => expect(store.loading()).toBe(false));
    expect(store.intervention()?.id).toBe('B');
    expect(pending.observed).toBe(false);
  });

  it('ignores a reload for another intervention and keeps the current workspace ready', async () => {
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.loadCallState().status).toBe('success'));
    mockService['get'].mockClear();

    store.reload('intervention-2');

    expect(mockService['get']).not.toHaveBeenCalled();
    expect(store.contextId()).toBe('intervention-1');
    expect(store.intervention()?.id).toBe('intervention-1');
    expect(store.loadCallState().status).toBe('success');
  });

  it('ignores an issue refresh that finishes after the workspace changes', async () => {
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.loadCallState().status).toBe('success'));
    const lateIssues = new Subject<{
      member: readonly InterventionIssueOutput[];
      totalItems: number;
    }>();
    mockService['listIssues'].mockReturnValueOnce(lateIssues);
    mockService['update'].mockReturnValueOnce(
      of({ ...intervention, status: 'in_progress', revision: 4 }),
    );

    store.transition({ interventionId: 'intervention-1', status: 'in_progress' });
    expect(store.issuesCallState().status).toBe('pending');

    mockService['get'].mockReturnValueOnce(of({ ...intervention, id: 'intervention-2' }));
    mockService['listAllWorkItems'].mockReturnValueOnce(of([]));
    store.load('intervention-2');
    await vi.waitFor(() => expect(store.loadCallState().status).toBe('success'));
    lateIssues.next({
      member: [{ severity: 'blocker', message: 'Stale issue' } as InterventionIssueOutput],
      totalItems: 1,
    });
    lateIssues.complete();

    expect(store.intervention()?.id).toBe('intervention-2');
    expect(store.issues()).toEqual([]);
    expect(store.issuesCallState().status).toBe('success');
  });

  it('does not apply an accepted team assignment to a newer workspace or A-B-A visit', async () => {
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.loading()).toBe(false));
    const old = new Subject<InterventionOutput>();
    const current = new Subject<InterventionOutput>();
    mockService['assignTeam'].mockReturnValueOnce(old).mockReturnValueOnce(current);
    store.assignTeam({ interventionId: 'intervention-1', input: { teamId: 'old-team' } });
    mockService['get'].mockReturnValueOnce(of({ ...intervention, id: 'B' }));
    store.load('B');
    await vi.waitFor(() => expect(store.loading()).toBe(false));
    expect(old.observed).toBe(true);
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.loading()).toBe(false));
    store.assignTeam({ interventionId: 'intervention-1', input: { teamId: 'current-team' } });
    old.next({ ...intervention, revision: 99 });
    old.complete();
    expect(store.intervention()?.revision).toBe(3);
    expect(store.assignTeamCallState().status).toBe('pending');
    store.assignTeam({ interventionId: 'intervention-1', input: { teamId: 'duplicate' } });
    expect(mockService['assignTeam']).toHaveBeenCalledTimes(2);
    current.next({ ...intervention, revision: 4 });
    current.complete();
    expect(store.intervention()?.revision).toBe(4);
    expect(store.assignTeamCallState().status).toBe('success');
  });

  it('ignores an old team assignment conflict without reloading the replacement workspace', async () => {
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.loading()).toBe(false));
    const old = new Subject<InterventionOutput>();
    mockService['assignTeam'].mockReturnValueOnce(old);
    store.assignTeam({ interventionId: 'intervention-1', input: { teamId: 'old-team' } });
    mockService['get'].mockReturnValueOnce(of({ ...intervention, id: 'B' }));
    store.load('B');
    await vi.waitFor(() => expect(store.loading()).toBe(false));
    const reads = mockService['get'].mock.calls.length;
    old.error(new HttpErrorResponse({ status: 409 }));
    expect(store.intervention()?.id).toBe('B');
    expect(store.assignTeamCallState().status).toBe('idle');
    expect(mockService['get']).toHaveBeenCalledTimes(reads);
  });

  it('preserves conflicted local intent when a fresh remote workspace arrives', async () => {
    const offline = TestBed.inject(InterventionOfflineService);
    vi.mocked(offline.getWorkspace).mockResolvedValue(null);
    vi.mocked(offline.listOutbox).mockResolvedValue([
      {
        id: 'op',
        interventionId: 'intervention-1',
        type: 'work-item.update',
        status: 'conflict',
        payload: { workItemId: workItem.id, status: 'completed' },
        createdAt: '2026-09-15',
      },
    ]);
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.loading()).toBe(false));
    expect(store.workItems()[0]?.status).toBe('completed');
    expect(offline.saveWorkspace).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([expect.objectContaining({ status: 'completed' })]),
      expect.anything(),
      expect.anything(),
    );
  });

  it('starts idle and reports neither loading nor saving', () => {
    expect(store.loadCallState().status).toBe('idle');
    expect(store.updateDetailsCallState().status).toBe('idle');
    expect(store.workItemWriteCallState().status).toBe('idle');
    expect(store.rejectChangeCallState().status).toBe('idle');
    expect(store.pendingWorkItemIds().size).toBe(0);
    expect(store.pendingChangeIds().size).toBe(0);
    expect(store.loading()).toBe(false);
    expect(store.saving()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('drives the load call state through to success', async () => {
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.loading()).toBe(false));

    expect(store.loadCallState().status).toBe('success');
    expect(store.error()).toBeNull();
  });

  it('keeps the whole 422 payload so a form can place each violation', async () => {
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.loading()).toBe(false));

    mockService['update'].mockReturnValue(throwError(() => violation));
    store.updateDetails({ interventionId: intervention.id, input: {} });
    await vi.waitFor(() => expect(store.saving()).toBe(false));

    expect(store.updateDetailsCallState().status).toBe('error');
    expect(store.updateDetailsCallState().error?.error).toEqual(violation); // The violations survive, so the edit drawer can land them on `dueAt`.
    expect(store.error()).toBe('dueAt: This value should be greater than plannedStartAt.');
  });

  it('falls back to a localized message when the failure carries nothing showable', async () => {
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.loading()).toBe(false));

    mockService['update'].mockReturnValue(throwError(() => new Error('Http failure response')));
    store.updateDetails({ interventionId: intervention.id, input: {} });
    await vi.waitFor(() => expect(store.saving()).toBe(false));

    // A raw transport message must never reach a field agent.
    expect(store.error()).toBe('Intervention planning details could not be saved.');
  });

  it('clears both call states on clearError', async () => {
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.loading()).toBe(false));

    mockService['update'].mockReturnValue(throwError(() => violation));
    store.updateDetails({ interventionId: intervention.id, input: {} });
    await vi.waitFor(() => expect(store.saving()).toBe(false));

    store.clearError();

    expect(store.updateDetailsCallState().status).toBe('idle');
    expect(store.loadCallState().status).toBe('idle');
    expect(store.error()).toBeNull();
  });

  it('replaces the intervention with the server response on a successful team assignment', async () => {
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.loading()).toBe(false));

    const updated = { ...intervention, participants: ['/api/organizations/org-1/members/m-1'] };
    mockService['assignTeam'].mockReturnValue(of(updated));

    store.assignTeam({ interventionId: 'intervention-1', input: { teamId: 'team-1' } });
    await vi.waitFor(() => expect(store.assignTeamCallState().status).toBe('success'));

    expect(mockService['assignTeam']).toHaveBeenCalledWith(
      'intervention-1',
      { teamId: 'team-1' },
      intervention.revision,
    );
    expect(store.intervention()?.participants).toEqual(['/api/organizations/org-1/members/m-1']);
  });

  it('surfaces the no-active-members message on a 422', async () => {
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.loading()).toBe(false));

    mockService['assignTeam'].mockReturnValue(
      throwError(() => ({
        '@type': 'ApiError',
        status: 422,
        type: '/errors/unprocessable-entity',
        title: 'Unprocessable Entity',
        detail: 'The team has no active members.',
      })),
    );

    store.assignTeam({ interventionId: 'intervention-1', input: { teamId: 'team-1' } });
    await vi.waitFor(() => expect(store.assignTeamCallState().status).toBe('error'));

    expect(store.assignTeamCallState().error?.message).toBe('This team has no active members.');
  });

  it('reloads the workspace on a 409 conflict', async () => {
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.loading()).toBe(false));

    mockService['assignTeam'].mockReturnValue(
      throwError(() => ({
        '@type': 'ApiError',
        status: 409,
        type: '/errors/conflict',
        title: 'Conflict',
        detail: 'The intervention has left the draft planning stage.',
      })),
    );
    mockService['get'].mockClear();

    store.assignTeam({ interventionId: 'intervention-1', input: { teamId: 'team-1' } });
    await vi.waitFor(() => expect(store.assignTeamCallState().status).toBe('error'));
    await vi.waitFor(() => expect(mockService['get']).toHaveBeenCalledWith('intervention-1'));
  });

  it('rejects a proposed change in place and unlocks its row', async () => {
    mockService['listAllChanges'].mockReturnValue(of([proposedChange]));
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.changes()).toHaveLength(1));

    mockService['updateChange'].mockReturnValue(
      of({ ...proposedChange, status: 'rejected', revision: 2 }),
    );
    store.rejectChange({ interventionId: 'intervention-1', changeId: 'change-1' });
    await vi.waitFor(() => expect(store.saving()).toBe(false));

    expect(mockService['updateChange']).toHaveBeenCalledWith('change-1', { status: 'rejected' }, 1);
    expect(store.changes()[0]?.status).toBe('rejected');
    expect(store.changes()[0]?.revision).toBe(2);
    expect(store.pendingChangeIds().size).toBe(0);
    expect(store.error()).toBeNull();
  });

  it('refreshes the issues checklist after a successful transition', async () => {
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.loading()).toBe(false));

    const blocker = {
      severity: 'blocker',
      message: 'No explicit work item',
    } as InterventionIssueOutput;
    mockService['listIssues'].mockReturnValue(
      of({
        '@id': '/api/interventions/intervention-1/issues',
        '@type': 'Collection',
        totalItems: 1,
        member: [blocker],
      }),
    );
    mockService['update'].mockReturnValue(of({ ...intervention, status: 'in_progress' }));

    store.transition({ interventionId: 'intervention-1', status: 'in_progress' });
    await vi.waitFor(() => expect(store.issues()).toEqual([blocker]));

    expect(mockService['listIssues']).toHaveBeenCalledTimes(2);
    expect(store.blockerCount()).toBe(1);
  });

  it('refreshes the issues checklist after a work item status write', async () => {
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.loading()).toBe(false));

    mockService['listIssues'].mockClear();
    mockService['listIssues'].mockReturnValue(
      of({
        '@id': '/api/interventions/intervention-1/issues',
        '@type': 'Collection',
        totalItems: 0,
        member: [] as readonly InterventionIssueOutput[],
      }),
    );
    mockService['updateWorkItem'].mockReturnValue(
      of({ ...workItem, status: 'completed', revision: 2 }),
    );

    store.setWorkItemStatus({
      interventionId: 'intervention-1',
      workItemId: 'work-item-1',
      status: 'completed',
    });
    await vi.waitFor(() => expect(store.pendingWorkItemIds().size).toBe(0));
    await vi.waitFor(() =>
      expect(mockService['listIssues']).toHaveBeenCalledWith('intervention-1'),
    );
  });

  it('ignores a second transition while one is already in flight', async () => {
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.loading()).toBe(false));

    const firstPatch = new Subject<InterventionOutput>();
    mockService['update'].mockReturnValue(firstPatch);

    store.transition({ interventionId: 'intervention-1', status: 'submitted' });
    store.transition({ interventionId: 'intervention-1', status: 'submitted' });

    expect(mockService['update']).toHaveBeenCalledTimes(1);

    firstPatch.next({ ...intervention, status: 'submitted', revision: 4 });
    firstPatch.complete();
    await vi.waitFor(() => expect(store.transitionCallState().status).toBe('success'));

    expect(mockService['update']).toHaveBeenCalledTimes(1);
    expect(store.intervention()?.revision).toBe(4);
  });

  it('dispatches rejectChangeFailed and keeps the change proposed on a server rejection', async () => {
    mockService['listAllChanges'].mockReturnValue(of([proposedChange]));
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.changes()).toHaveLength(1));

    const dispatcher = TestBed.inject(Dispatcher);
    const dispatchSpy = vi.spyOn(dispatcher, 'dispatch');
    mockService['updateChange'].mockReturnValue(
      throwError(() => ({
        '@id': '',
        '@type': 'Error',
        status: 403,
        type: 'about:blank',
        title: 'Forbidden',
        detail: 'You are not allowed to review this change.',
      })),
    );

    store.rejectChange({ interventionId: 'intervention-1', changeId: 'change-1' });
    await vi.waitFor(() => expect(store.pendingChangeIds().size).toBe(0));

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Intervention Workspace Store] rejectChangeFailed' }),
    );
    expect(store.changes()[0]?.status).toBe('proposed');
    expect(store.error()).toContain('not allowed');
    expect(store.changeErrors()[store.changes()[0]?.id ?? '']).toContain('not allowed');
  });

  it('ignores a rejection for a change that is no longer proposed', async () => {
    mockService['listAllChanges'].mockReturnValue(
      of([{ ...proposedChange, status: 'rejected' as const }]),
    );
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.changes()).toHaveLength(1));

    store.rejectChange({ interventionId: 'intervention-1', changeId: 'change-1' });

    expect(mockService['updateChange']).not.toHaveBeenCalled();
    expect(store.pendingChangeIds().size).toBe(0);
  });

  it('marks each work-item row while its own write is in flight', async () => {
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.loading()).toBe(false));

    const write = new Subject<InterventionWorkItemOutput>();
    mockService['updateWorkItem'].mockReturnValue(write);

    store.setWorkItemStatus({
      interventionId: 'intervention-1',
      workItemId: workItem.id,
      status: 'in_progress',
    });
    await vi.waitFor(() => expect(store.pendingWorkItemIds().has(workItem.id)).toBe(true));
    expect(store.saving()).toBe(true);

    write.next({ ...workItem, status: 'in_progress', revision: 2 });
    write.complete();
    await vi.waitFor(() => expect(store.pendingWorkItemIds().size).toBe(0));
    expect(store.saving()).toBe(false);
  });

  it('blanks the workspace on load, so entry never shows the previous intervention', () => {
    const pendingGet = new Subject<InterventionOutput>();
    mockService['get'].mockReturnValue(pendingGet);

    store.load('intervention-1');

    expect(store.intervention()).toBeNull();
    expect(store.workItems()).toEqual([]);
  });

  it('keeps the workspace on screen while reload is in flight', async () => {
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.loading()).toBe(false));

    const pendingGet = new Subject<InterventionOutput>();
    mockService['get'].mockReturnValue(pendingGet);
    store.reload('intervention-1');

    expect(store.loading()).toBe(true);
    expect(store.intervention()).not.toBeNull();
    expect(store.workItems()).toHaveLength(1);
  });

  it('keeps the workspace on screen when a reload fails', async () => {
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.loading()).toBe(false));

    mockService['get'].mockReturnValue(throwError(() => new Error('Http failure response')));
    store.reload('intervention-1');
    await vi.waitFor(() => expect(store.loading()).toBe(false));

    expect(store.loadCallState().status).toBe('error');
    expect(store.intervention()).not.toBeNull();
    expect(store.error()).toBe('The intervention workspace could not be loaded.');
  });

  it('accepts an empty work item deletion without a network write', async () => {
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.loadCallState().status).toBe('success'));

    store.deleteWorkItems({ interventionId: 'intervention-1', workItems: [] });

    expect(mockService['removeWorkItem']).not.toHaveBeenCalled();
    expect(store.deleteWorkItemsCallState().status).toBe('success');
    expect(store.workItems()).toEqual([workItem]);
  });

  it('does not apply a late work item deletion to a replacement workspace', async () => {
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.loadCallState().status).toBe('success'));
    const pendingDelete = new Subject<void>();
    mockService['removeWorkItem'].mockReturnValueOnce(pendingDelete);
    store.deleteWorkItems({ interventionId: 'intervention-1', workItems: [workItem] });
    expect(store.deleteWorkItemsCallState().status).toBe('pending');

    mockService['get'].mockReturnValueOnce(of({ ...intervention, id: 'intervention-2' }));
    store.load('intervention-2');
    await vi.waitFor(() => expect(store.loadCallState().status).toBe('success'));
    const dispatchSpy = vi.spyOn(TestBed.inject(Dispatcher), 'dispatch');
    pendingDelete.next(undefined);
    pendingDelete.complete();

    expect(store.intervention()?.id).toBe('intervention-2');
    expect(store.workItems()).toEqual([workItem]);
    expect(store.deleteWorkItemsCallState().status).toBe('idle');
    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});

describe('InterventionWorkspaceStore evidence upload', () => {
  let store: InstanceType<typeof InterventionWorkspaceStore>;
  let mockService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
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
      uploadAttachment: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        InterventionWorkspaceStore,
        { provide: InterventionService, useValue: mockService },
        {
          provide: InterventionOfflineService,
          useValue: {
            getWorkspace: vi.fn(),
            saveWorkspace: vi.fn().mockResolvedValue(undefined),
            queue: vi.fn().mockResolvedValue(undefined),
            listOutbox: vi.fn().mockResolvedValue([]),
            removeOutbox: vi.fn().mockResolvedValue(undefined),
            attachmentQueueUsage: vi.fn().mockResolvedValue({ count: 0, bytes: 0 }),
          },
        },
      ],
    });

    store = TestBed.inject(InterventionWorkspaceStore);
    store.load('intervention-1');
    await vi.waitFor(() => expect(store.loading()).toBe(false));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('threads workItemId to the service and bumps the matching item evidence count', async () => {
    await vi.waitFor(() => expect(store.loading()).toBe(false));

    const created = {
      '@id': '/api/intervention-attachments/attachment-1',
      '@type': 'InterventionAttachment',
      id: 'attachment-1',
      interventionId: 'intervention-1',
      fileName: 'evidence.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      workItemId: workItem.id,
      revision: 1,
      uploadedAt: '2026-06-12T08:00:00.000Z',
    };
    mockService['uploadAttachment'].mockReturnValue(of(created));

    const file = new Blob(['data'], { type: 'image/jpeg' });
    store.uploadAttachment({
      interventionId: 'intervention-1',
      file,
      fileName: 'evidence.jpg',
      workItemId: workItem.id,
    });

    await vi.waitFor(() => expect(store.attachmentWriteCallState().status).toBe('success'));

    expect(mockService['uploadAttachment']).toHaveBeenCalledWith(
      'intervention-1',
      file,
      'evidence.jpg',
      undefined,
      workItem.id,
      undefined,
    );
    expect(store.attachments()).toEqual([created]);
    expect(store.workItems()[0]?.evidenceCount).toBe(1);
  });

  it('leaves the work items untouched when the upload carries no workItemId', async () => {
    await vi.waitFor(() => expect(store.loading()).toBe(false));

    const created = {
      '@id': '/api/intervention-attachments/attachment-2',
      '@type': 'InterventionAttachment',
      id: 'attachment-2',
      interventionId: 'intervention-1',
      fileName: 'report.pdf',
      mimeType: 'application/pdf',
      size: 2048,
      revision: 1,
      uploadedAt: '2026-06-12T08:00:00.000Z',
    };
    mockService['uploadAttachment'].mockReturnValue(of(created));

    const file = new Blob(['data'], { type: 'application/pdf' });
    store.uploadAttachment({ interventionId: 'intervention-1', file, fileName: 'report.pdf' });

    await vi.waitFor(() => expect(store.attachmentWriteCallState().status).toBe('success'));

    expect(store.workItems()[0]?.evidenceCount).toBe(0);
  });

  it('threads kind to the service and dispatches attachmentUploadSucceeded on a signature upload', async () => {
    await vi.waitFor(() => expect(store.loading()).toBe(false));

    const dispatcher = TestBed.inject(Dispatcher);
    const dispatchSpy = vi.spyOn(dispatcher, 'dispatch');

    const created = {
      '@id': '/api/intervention-attachments/attachment-3',
      '@type': 'InterventionAttachment',
      id: 'attachment-3',
      interventionId: 'intervention-1',
      fileName: 'signature.png',
      mimeType: 'image/png',
      size: 512,
      kind: 'signature',
      revision: 1,
      uploadedAt: '2026-06-12T08:00:00.000Z',
    };
    mockService['uploadAttachment'].mockReturnValue(of(created));

    const file = new Blob(['data'], { type: 'image/png' });
    store.uploadAttachment({
      interventionId: 'intervention-1',
      file,
      fileName: 'signature.png',
      kind: 'signature',
    });

    await vi.waitFor(() => expect(store.attachmentWriteCallState().status).toBe('success'));

    expect(mockService['uploadAttachment']).toHaveBeenCalledWith(
      'intervention-1',
      file,
      'signature.png',
      undefined,
      undefined,
      'signature',
    );
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: '[Intervention Workspace Store] attachmentUploadSucceeded',
        payload: { attachment: created },
      }),
    );
  });
});

describe('InterventionWorkspaceStore offline attachment queue', () => {
  let store: InstanceType<typeof InterventionWorkspaceStore>;
  let mockService: Record<string, ReturnType<typeof vi.fn>>;
  let mockOffline: {
    getWorkspace: ReturnType<typeof vi.fn>;
    saveWorkspace: ReturnType<typeof vi.fn>;
    queue: ReturnType<typeof vi.fn>;
    listOutbox: ReturnType<typeof vi.fn>;
    removeOutbox: ReturnType<typeof vi.fn>;
    attachmentQueueUsage: ReturnType<typeof vi.fn>;
  };

  const queuedOperation = {
    id: 'op-1',
    interventionId: 'intervention-1',
    type: 'attachment.upload',
    payload: {
      clientId: 'client-1',
      file: new Blob(['data'], { type: 'image/jpeg' }),
      fileName: 'evidence.jpg',
      mimeType: 'image/jpeg',
      size: 4,
    },
    createdAt: '2026-06-12T08:00:00.000Z',
    status: 'pending',
    error: null,
  };

  beforeEach(async () => {
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
      listAttachments: vi.fn().mockReturnValue(
        of({
          '@id': '/api/interventions/intervention-1/attachments',
          '@type': 'Collection',
          totalItems: 0,
          member: [],
        }),
      ),
      uploadAttachment: vi.fn(),
    };
    mockOffline = {
      getWorkspace: vi.fn(),
      saveWorkspace: vi.fn().mockResolvedValue(undefined),
      queue: vi.fn().mockResolvedValue(undefined),
      listOutbox: vi.fn().mockResolvedValue([queuedOperation]),
      removeOutbox: vi.fn().mockResolvedValue(undefined),
      attachmentQueueUsage: vi.fn().mockResolvedValue({ count: 0, bytes: 0 }),
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
    await vi.waitFor(() => expect(store.loading()).toBe(false));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('queues the upload offline with its metadata and surfaces the queued row', async () => {
    const file = new Blob(['data'], { type: 'image/jpeg' });
    store.uploadAttachment({ interventionId: 'intervention-1', file, fileName: 'evidence.jpg' });

    await vi.waitFor(() => expect(store.attachmentWriteCallState().status).toBe('success'));

    expect(mockService['uploadAttachment']).not.toHaveBeenCalled();
    expect(mockOffline.queue).toHaveBeenCalledWith(
      'intervention-1',
      'attachment.upload',
      expect.objectContaining({
        file,
        fileName: 'evidence.jpg',
        mimeType: 'image/jpeg',
        size: 4,
        clientId: expect.any(String),
      }),
    );
    expect(store.queuedAttachments()).toEqual([
      expect.objectContaining({
        id: 'op-1',
        clientId: 'client-1',
        fileName: 'evidence.jpg',
        size: 4,
        queuedAt: '2026-06-12T08:00:00.000Z',
      }),
    ]);
  });

  it('queues the upload when an online attempt fails on a network error', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    mockService['uploadAttachment'].mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );

    const file = new Blob(['data'], { type: 'image/jpeg' });
    store.uploadAttachment({ interventionId: 'intervention-1', file, fileName: 'evidence.jpg' });

    await vi.waitFor(() => expect(store.attachmentWriteCallState().status).toBe('success'));

    expect(mockOffline.queue).toHaveBeenCalledWith(
      'intervention-1',
      'attachment.upload',
      expect.objectContaining({ fileName: 'evidence.jpg' }),
    );
    expect(store.queuedAttachments()).toHaveLength(1);
  });

  it('refuses to queue past the storage quota and names the bound', async () => {
    mockOffline.attachmentQueueUsage.mockResolvedValue({ count: 25, bytes: 1024 });

    const file = new Blob(['data'], { type: 'image/jpeg' });
    store.uploadAttachment({ interventionId: 'intervention-1', file, fileName: 'evidence.jpg' });

    await vi.waitFor(() => expect(store.attachmentWriteCallState().status).toBe('error'));

    expect(mockOffline.queue).not.toHaveBeenCalled();
    const callState = store.attachmentWriteCallState();
    expect(callState.status === 'error' ? callState.error?.message : null).toContain(
      '25 files or 50 MB',
    );
  });

  it('refuses to queue a file that would overflow the byte quota', async () => {
    mockOffline.attachmentQueueUsage.mockResolvedValue({ count: 1, bytes: 50 * 1024 * 1024 });

    const file = new Blob(['data'], { type: 'image/jpeg' });
    store.uploadAttachment({ interventionId: 'intervention-1', file, fileName: 'evidence.jpg' });

    await vi.waitFor(() => expect(store.attachmentWriteCallState().status).toBe('error'));

    expect(mockOffline.queue).not.toHaveBeenCalled();
  });

  it('does not queue a signature upload offline', async () => {
    mockService['uploadAttachment'].mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );

    const file = new Blob(['data'], { type: 'image/png' });
    store.uploadAttachment({
      interventionId: 'intervention-1',
      file,
      fileName: 'signature.png',
      kind: 'signature',
    });

    await vi.waitFor(() => expect(store.attachmentWriteCallState().status).toBe('error'));

    expect(mockOffline.queue).not.toHaveBeenCalled();
    expect(store.queuedAttachments()).toEqual([]);
  });

  it('discards a queued upload and refreshes the queued rows', async () => {
    mockOffline.listOutbox.mockResolvedValue([]);

    store.removeQueuedAttachment({
      id: 'op-1',
      clientId: 'client-1',
      interventionId: 'intervention-1',
      fileName: 'evidence.jpg',
      mimeType: 'image/jpeg',
      size: 4,
      queuedAt: '2026-06-12T08:00:00.000Z',
    });

    await vi.waitFor(() => expect(mockOffline.removeOutbox).toHaveBeenCalledWith('op-1'));
    await vi.waitFor(() => expect(store.queuedAttachments()).toEqual([]));
  });

  it('loads the queued rows with the attachments', async () => {
    store.loadAttachments('intervention-1');

    await vi.waitFor(() => expect(store.attachmentsCallState().status).toBe('success'));

    expect(store.attachments()).toEqual([]);
    expect(store.queuedAttachments()).toEqual([
      expect.objectContaining({ id: 'op-1', fileName: 'evidence.jpg' }),
    ]);
  });

  it('keeps server attachments visible when reading the device outbox fails', async () => {
    const attachment = { id: 'server-attachment', revision: 1 };
    mockService['listAttachments'].mockReturnValueOnce(of({ totalItems: 1, member: [attachment] }));
    mockOffline.listOutbox.mockRejectedValueOnce(new Error('IndexedDB unavailable'));

    store.loadAttachments('intervention-1');

    await vi.waitFor(() => expect(store.attachmentsCallState().status).toBe('success'));
    expect(store.attachments()).toEqual([attachment]);
    expect(store.queuedAttachments()).toEqual([]);
  });

  it('reports an outbox deletion failure and retains its queued attachment', async () => {
    store.loadAttachments('intervention-1');
    await vi.waitFor(() => expect(store.queuedAttachments()).toHaveLength(1));
    mockOffline.removeOutbox.mockRejectedValueOnce(new Error('IndexedDB unavailable'));

    store.removeQueuedAttachment(store.queuedAttachments()[0]);

    await vi.waitFor(() => expect(store.attachmentDeleteCallState().status).toBe('error'));
    expect(store.queuedAttachments()).toHaveLength(1);
  });
});

describe('InterventionWorkspaceStore', () => {
  let store: InstanceType<typeof InterventionWorkspaceStore>;
  let owner: string;
  const service = {
    get: vi.fn(),
    listAllWorkItems: vi.fn(),
    listAllChanges: vi.fn(),
    listIssues: vi.fn(),
    update: vi.fn(),
    updateWorkItem: vi.fn(),
    createWorkItem: vi.fn(),
    updateChange: vi.fn(),
    removeWorkItem: vi.fn(),
    listAttachments: vi.fn(),
    removeAttachment: vi.fn(),
  };
  const offline = {
    publicationOwner: vi.fn(),
    listOutbox: vi.fn(),
    getWorkspace: vi.fn(),
    queue: vi.fn(),
    saveWorkspace: vi.fn(),
  };
  const connectivity = { isOffline: vi.fn(), isNetworkFailure: vi.fn() };
  const dispatch = vi.fn();
  const assessment = {
    confirmationRequired: true,
    confirmationToken: 'reviewed-workload-token',
    completeness: 'complete',
    increases: [{ memberId: 'member-1', beforeMinutes: 0, afterMinutes: 60, reason: 'overload' }],
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    owner = 'account-1';
    offline.publicationOwner.mockImplementation(() => owner);
    offline.listOutbox.mockResolvedValue([]);
    offline.getWorkspace.mockResolvedValue(null);
    offline.queue.mockResolvedValue(undefined);
    offline.saveWorkspace.mockResolvedValue(undefined);
    connectivity.isOffline.mockReturnValue(false);
    connectivity.isNetworkFailure.mockImplementation(
      (error: unknown) => error instanceof HttpErrorResponse && error.status === 0,
    );
    service.get.mockReturnValue(of(intervention));
    service.listAllWorkItems.mockReturnValue(of([workItem]));
    service.listAllChanges.mockReturnValue(of([]));
    service.listIssues.mockReturnValue(of({ member: [], totalItems: 0 }));
    service.update.mockReturnValue(of({ ...intervention, revision: 4 }));
    service.updateWorkItem.mockReturnValue(of({ ...workItem, revision: 2 }));
    service.createWorkItem.mockReturnValue(of({ ...workItem, id: 'new-work-item' }));
    service.updateChange.mockReturnValue(of({ ...proposedChange, status: 'rejected' }));
    service.removeWorkItem.mockReturnValue(of(undefined));
    service.listAttachments.mockReturnValue(of({ member: [], totalItems: 0 }));
    service.removeAttachment.mockReturnValue(of(undefined));
    TestBed.configureTestingModule({
      providers: [
        InterventionWorkspaceStore,
        { provide: InterventionService, useValue: service },
        { provide: InterventionOfflineService, useValue: offline },
        { provide: ConnectivityService, useValue: connectivity },
        { provide: Dispatcher, useValue: { dispatch } },
      ],
    });
    store = TestBed.inject(InterventionWorkspaceStore);
    store.load(intervention.id);
    await vi.waitFor(() => expect(store.loadCallState().status).toBe('success'));
    offline.saveWorkspace.mockClear();
  });

  it('updates explicit planning fields against the captured task revision and preserves the other rows', () => {
    const response = { ...workItem, estimatedMinutes: 240, revision: 2 };
    service.updateWorkItem.mockReturnValueOnce(of(response));
    store.updateWorkItem({
      interventionId: intervention.id,
      item: workItem,
      input: { estimatedMinutes: 240 },
    });
    expect(service.updateWorkItem).toHaveBeenCalledExactlyOnceWith(
      workItem.id,
      { estimatedMinutes: 240 },
      1,
    );
    expect(store.workItems()).toEqual([response]);
    expect(store.workItemWriteCallState().status).toBe('success');
    expect(store.pendingWorkItemIds().size).toBe(0);
    expect(offline.saveWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ revision: 4 }),
      [response],
      [],
      [],
      [],
      { replace: false },
    );
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          source: 'remote',
          collections: ['workItems', 'activity'],
          workItem: response,
        }),
      }),
    );
    expect(store.loadFailed()).toBe(false);
    expect(store.nextWorkItem()).toEqual(response);
  });

  it.each(['offline', 'network-failure'] as const)(
    'queues reassignment after %s without reusing the previous assignee identity',
    async (mode) => {
      const assigned = {
        ...workItem,
        assignee: 'member-old',
        assigneeProfile: {
          member: 'member-old',
          userId: null,
          displayName: 'Former assignee',
          avatarUrl: null,
        },
      };
      if (mode === 'offline') connectivity.isOffline.mockReturnValue(true);
      else
        service.updateWorkItem.mockReturnValueOnce(
          throwError(() => new HttpErrorResponse({ status: 0 })),
        );
      store.updateWorkItem({
        interventionId: intervention.id,
        item: assigned,
        input: { assignee: 'member-new', remainingMinutes: 120 },
      });
      await vi.waitFor(() => expect(store.workItemWriteCallState().status).toBe('success'));
      expect(offline.queue).toHaveBeenCalledExactlyOnceWith(intervention.id, 'work-item.update', {
        workItemId: workItem.id,
        revision: 1,
        assignee: 'member-new',
        remainingMinutes: 120,
      });
      expect(store.workItems()[0]).toMatchObject({
        revision: 2,
        assignee: 'member-new',
        assigneeProfile: null,
        remainingMinutes: 120,
      });
      expect(service.listIssues).toHaveBeenCalledTimes(1);
      expect(store.pendingWorkItemIds().size).toBe(0);
    },
  );

  it('updates task progress for a status command and refuses duplicate commands while the server responds', () => {
    const pending = new Subject<InterventionWorkItemOutput>();
    service.updateWorkItem.mockReturnValueOnce(pending);
    const command = {
      interventionId: intervention.id,
      item: workItem,
      input: { status: 'completed' as const },
    };
    store.updateWorkItem(command);
    store.updateWorkItem(command);
    expect(service.updateWorkItem).toHaveBeenCalledTimes(1);
    expect(store.pendingWorkItemIds().has(workItem.id)).toBe(true);
    pending.next({ ...workItem, status: 'completed', revision: 2 });
    pending.complete();
    expect(store.intervention()?.completedWorkItemsCount).toBe(1);
    expect(store.pendingWorkItemIds().size).toBe(0);
  });

  it.each(['organization', 'account'] as const)(
    'does not apply a late task write after the %s context changes',
    async (scope) => {
      const pending = new Subject<InterventionWorkItemOutput>();
      service.updateWorkItem.mockReturnValueOnce(pending);
      store.updateWorkItem({
        interventionId: intervention.id,
        item: workItem,
        input: { estimatedMinutes: 120 },
      });
      if (scope === 'account') owner = 'account-2';
      else {
        service.get.mockReturnValueOnce(of({ ...intervention, id: 'intervention-2' }));
        store.load('intervention-2');
        await vi.waitFor(() => expect(store.loadCallState().status).toBe('success'));
      }
      dispatch.mockClear();
      offline.saveWorkspace.mockClear();
      pending.next({ ...workItem, estimatedMinutes: 120, revision: 2 });
      pending.complete();
      expect(store.workItems()[0]?.revision).toBe(1);
      expect(dispatch).not.toHaveBeenCalled();
      expect(offline.saveWorkspace).not.toHaveBeenCalled();
    },
  );

  it('keeps task input available through a row-specific error and unlocks the rejected command', () => {
    service.updateWorkItem.mockReturnValueOnce(
      throwError(
        () => new HttpErrorResponse({ status: 412, error: { detail: 'Task revision changed' } }),
      ),
    );
    store.updateWorkItem({
      interventionId: intervention.id,
      item: workItem,
      input: { remainingMinutes: 180 },
    });
    expect(store.workItemWriteCallState().status).toBe('error');
    expect(store.workItemErrors()[workItem.id]).toBe('Task revision changed');
    expect(store.pendingWorkItemIds().size).toBe(0);
    expect(store.workItems()).toEqual([workItem]);
    expect(offline.queue).not.toHaveBeenCalled();
  });

  it.each(['create', 'details', 'transition', 'workItem'] as const)(
    'retries the captured %s proposal only with the exact reviewed workload token',
    (kind) => {
      const rejection = { status: 409, detail: 'Workload confirmation required', assessment };
      if (kind === 'create') {
        service.createWorkItem.mockReturnValueOnce(throwError(() => rejection));
        store.createWorkItem({
          interventionId: intervention.id,
          input: {
            clientId: 'stable-client-id',
            intervention: intervention['@id'],
            action: 'inventory',
            source: 'planned',
            required: true,
          },
        });
      } else if (kind === 'workItem') {
        service.updateWorkItem.mockReturnValueOnce(throwError(() => rejection));
        store.updateWorkItem({
          interventionId: intervention.id,
          item: workItem,
          input: { remainingMinutes: 120 },
        });
      } else {
        service.update.mockReturnValueOnce(throwError(() => rejection));
        if (kind === 'details')
          store.updateDetails({ interventionId: intervention.id, input: { priority: 'urgent' } });
        else store.transition({ interventionId: intervention.id, status: 'in_progress' });
      }
      expect(store.planningConfirmation()?.kind).toBe(kind);
      store.confirmPlanning('different-token');
      expect(store.planningConfirmation()?.kind).toBe(kind);
      store.confirmPlanning(assessment.confirmationToken);
      expect(store.planningConfirmation()).toBeNull();
      if (kind === 'create')
        expect(service.createWorkItem).toHaveBeenLastCalledWith(
          expect.objectContaining({
            clientId: 'stable-client-id',
            workloadConfirmationToken: assessment.confirmationToken,
          }),
        );
      else if (kind === 'workItem')
        expect(service.updateWorkItem).toHaveBeenLastCalledWith(
          workItem.id,
          {
            remainingMinutes: 120,
            workloadConfirmationToken: assessment.confirmationToken,
          },
          1,
        );
      else
        expect(service.update).toHaveBeenLastCalledWith(
          intervention.id,
          expect.objectContaining({
            workloadConfirmationToken: assessment.confirmationToken,
          }),
          3,
        );
    },
  );

  it('lets the operator dismiss a workload proposal without writing or reusing its consent later', () => {
    service.updateWorkItem.mockReturnValueOnce(throwError(() => ({ status: 409, assessment })));
    store.updateWorkItem({
      interventionId: intervention.id,
      item: workItem,
      input: { remainingMinutes: 120 },
    });
    store.dismissPlanningConfirmation();
    store.confirmPlanning(assessment.confirmationToken);
    expect(store.planningConfirmation()).toBeNull();
    expect(service.updateWorkItem).toHaveBeenCalledTimes(1);
  });

  it('keeps one in-flight creation and appends only the accepted server work item', () => {
    const pending = new Subject<InterventionWorkItemOutput>();
    service.createWorkItem.mockReturnValueOnce(pending);
    store.createWorkItem({
      interventionId: intervention.id,
      input: {
        clientId: 'first-client-id',
        intervention: intervention['@id'],
        action: 'inventory',
        source: 'discovered',
        required: false,
      },
    });
    store.createWorkItem({
      interventionId: intervention.id,
      input: {
        clientId: 'second-client-id',
        intervention: intervention['@id'],
        action: 'inventory',
        source: 'discovered',
        required: false,
      },
    });

    expect(service.createWorkItem).toHaveBeenCalledTimes(1);
    expect(store.createWorkItemCallState().status).toBe('pending');

    pending.next({ ...workItem, id: 'created-item' });
    pending.complete();

    expect(store.createWorkItemCallState().status).toBe('success');
    expect(store.workItems().map((item) => item.id)).toEqual(['work-item-1', 'created-item']);
    expect(store.intervention()?.workItemsCount).toBe(2);
  });

  it('ignores a creation result from an intervention that has since been replaced', async () => {
    const pending = new Subject<InterventionWorkItemOutput>();
    service.createWorkItem.mockReturnValueOnce(pending);
    store.createWorkItem({
      interventionId: intervention.id,
      input: {
        clientId: 'stale-client-id',
        intervention: intervention['@id'],
        action: 'inventory',
        source: 'discovered',
        required: false,
      },
    });

    service.get.mockReturnValueOnce(
      of({ ...intervention, id: 'replacement', '@id': '/api/interventions/replacement' }),
    );
    service.listAllWorkItems.mockReturnValueOnce(of([]));
    store.load('replacement');
    await vi.waitFor(() => expect(store.contextId()).toBe('replacement'));

    pending.next({ ...workItem, id: 'stale-item' });
    pending.complete();

    expect(store.workItems()).toEqual([]);
    expect(store.intervention()?.workItemsCount).toBe(1);
    expect(store.createWorkItemCallState().status).toBe('idle');
  });

  it('queues a stable creation when the online request loses connectivity', async () => {
    service.createWorkItem.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );
    store.createWorkItem({
      interventionId: intervention.id,
      input: {
        clientId: 'retryable-client-id',
        intervention: intervention['@id'],
        action: 'inventory',
        source: 'discovered',
        required: false,
      },
    });

    await vi.waitFor(() => expect(store.createWorkItemCallState().status).toBe('success'));
    expect(offline.queue).toHaveBeenCalledExactlyOnceWith(
      intervention.id,
      'work-item.create',
      expect.objectContaining({ clientId: 'retryable-client-id' }),
    );
    expect(store.workItems().at(-1)?.id).toBe('retryable-client-id');
  });

  it('keeps the original workspace and skips the outbox for an authorization refusal', () => {
    service.createWorkItem.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );
    store.createWorkItem({
      interventionId: intervention.id,
      input: {
        clientId: 'forbidden-client-id',
        intervention: intervention['@id'],
        action: 'inventory',
        source: 'discovered',
        required: false,
      },
    });

    expect(store.createWorkItemCallState().status).toBe('error');
    expect(store.workItems()).toEqual([workItem]);
    expect(offline.queue).not.toHaveBeenCalled();
  });

  it.each(['offline', 'network-failure'] as const)(
    'preserves an explicit transition revision and consent in the outbox after %s',
    async (mode) => {
      if (mode === 'offline') connectivity.isOffline.mockReturnValue(true);
      else
        service.update.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));
      store.transition({
        interventionId: intervention.id,
        status: 'in_progress',
        revision: 3,
        workloadConfirmationToken: 'reviewed-token',
      });
      await vi.waitFor(() => expect(store.transitionCallState().status).toBe('success'));
      expect(offline.queue).toHaveBeenCalledExactlyOnceWith(
        intervention.id,
        'intervention.update',
        {
          status: 'in_progress',
          reviewNote: undefined,
          revision: 3,
          workloadConfirmationToken: 'reviewed-token',
        },
      );
      expect(store.intervention()).toMatchObject({ status: 'in_progress', revision: 4 });
      expect(offline.saveWorkspace).toHaveBeenCalled();
    },
  );

  it.each([
    [412, 'Refresh and try again.'],
    [403, 'You do not have permission'],
    [422, 'not allowed'],
    [500, 'could not be updated'],
  ] as const)(
    'surfaces an actionable transition refusal for HTTP %s without queueing it',
    (status, message) => {
      service.update.mockReturnValueOnce(
        throwError(() => new HttpErrorResponse({ status, error: { detail: 'Refused' } })),
      );
      store.transition({ interventionId: intervention.id, status: 'in_progress' });
      expect(store.transitionCallState().status).toBe('error');
      expect(store.error()).toContain(message);
      expect(offline.queue).not.toHaveBeenCalled();
      expect(store.intervention()?.revision).toBe(3);
    },
  );

  it('preserves a queued planning draft failure instead of reporting that device persistence succeeded', async () => {
    service.update.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));
    offline.queue.mockRejectedValueOnce(new Error('Device storage full'));
    store.updateDetails({ interventionId: intervention.id, input: { priority: 'urgent' } });
    await vi.waitFor(() => expect(store.updateDetailsCallState().status).toBe('error'));
    expect(store.intervention()?.revision).toBe(3);
    expect(store.error()).toContain('could not be saved');
  });

  it('serializes planning dates and labels before queueing an offline edit', async () => {
    connectivity.isOffline.mockReturnValue(true);
    const plannedStartAt = new Date('2026-07-01T08:30:00.000Z');

    store.updateDetails({
      interventionId: intervention.id,
      revision: 2,
      input: { plannedStartAt, dueAt: null, labelIds: ['safety'], priority: 'urgent' },
    });

    await vi.waitFor(() => expect(store.updateDetailsCallState().status).toBe('success'));
    expect(service.update).not.toHaveBeenCalled();
    expect(offline.queue).toHaveBeenCalledExactlyOnceWith(intervention.id, 'intervention.update', {
      plannedStartAt: plannedStartAt.toISOString(),
      dueAt: null,
      labelIds: ['safety'],
      priority: 'urgent',
      revision: 2,
    });
    expect(store.intervention()).toMatchObject({
      plannedStartAt: plannedStartAt.toISOString(),
      dueAt: null,
      priority: 'urgent',
      revision: 4,
    });
    expect(offline.saveWorkspace).toHaveBeenCalled();
  });

  it('does not apply a late planning response to a replacement intervention', async () => {
    const pending = new Subject<InterventionOutput>();
    service.update.mockReturnValueOnce(pending);
    store.updateDetails({ interventionId: intervention.id, input: { priority: 'urgent' } });
    service.get.mockReturnValueOnce(
      of({ ...intervention, id: 'replacement', '@id': '/api/interventions/replacement' }),
    );
    store.load('replacement');
    await vi.waitFor(() => expect(store.contextId()).toBe('replacement'));
    dispatch.mockClear();

    pending.next({ ...intervention, priority: 'urgent', revision: 4 });
    pending.complete();

    expect(store.intervention()?.id).toBe('replacement');
    expect(store.intervention()?.priority).not.toBe('urgent');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('queues a skipped task with its reason after a network drop and unlocks the row', async () => {
    const pending = new Subject<InterventionWorkItemOutput>();
    service.updateWorkItem.mockReturnValueOnce(pending);
    const command = {
      interventionId: intervention.id,
      workItemId: workItem.id,
      status: 'skipped' as const,
      skipReason: 'Equipment unavailable',
    };
    store.setWorkItemStatus(command);
    store.setWorkItemStatus(command);
    expect(service.updateWorkItem).toHaveBeenCalledTimes(1);
    expect(store.pendingWorkItemIds().has(workItem.id)).toBe(true);

    pending.error(new HttpErrorResponse({ status: 0 }));

    await vi.waitFor(() => expect(store.workItemWriteCallState().status).toBe('success'));
    expect(offline.queue).toHaveBeenCalledExactlyOnceWith(intervention.id, 'work-item.update', {
      workItemId: workItem.id,
      status: 'skipped',
      skipReason: 'Equipment unavailable',
      revision: 1,
    });
    expect(store.workItems()[0]).toMatchObject({
      status: 'skipped',
      skipReason: 'Equipment unavailable',
      revision: 2,
    });
    expect(store.pendingWorkItemIds().size).toBe(0);
  });

  it('keeps a status refusal on its task row and captures the workload review', () => {
    service.updateWorkItem.mockReturnValueOnce(
      throwError(() => ({ status: 409, detail: 'Review required', assessment })),
    );

    store.setWorkItemStatus({
      interventionId: intervention.id,
      workItemId: workItem.id,
      status: 'completed',
    });

    expect(store.workItemWriteCallState().status).toBe('error');
    expect(store.workItemErrors()[workItem.id]).toBeTruthy();
    expect(store.planningConfirmation()?.kind).toBe('workItem');
    expect(store.workItems()).toEqual([workItem]);
    expect(store.pendingWorkItemIds().size).toBe(0);
    expect(offline.queue).not.toHaveBeenCalled();
  });

  it('queues a proposed change rejection when the server connection drops', async () => {
    service.listAllChanges.mockReturnValueOnce(of([proposedChange]));
    store.load(intervention.id);
    await vi.waitFor(() => expect(store.changes()).toHaveLength(1));
    service.updateChange.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );

    store.rejectChange({ interventionId: intervention.id, changeId: proposedChange.id });

    await vi.waitFor(() => expect(store.rejectChangeCallState().status).toBe('success'));
    expect(offline.queue).toHaveBeenCalledExactlyOnceWith(intervention.id, 'change.update', {
      changeId: proposedChange.id,
      status: 'rejected',
      revision: 1,
    });
    expect(store.changes()[0]).toMatchObject({ status: 'rejected', revision: 2 });
    expect(store.pendingChangeIds().size).toBe(0);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ source: 'queued', collections: ['changes'] }),
      }),
    );
  });

  it('retains loaded attachments when the next server listing fails', async () => {
    const attachment = { id: 'attachment-1', revision: 4 };
    service.listAttachments.mockReturnValueOnce(of({ member: [attachment], totalItems: 1 }));
    store.loadAttachments(intervention.id);
    await vi.waitFor(() => expect(store.attachmentsCallState().status).toBe('success'));
    service.listAttachments.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    store.loadAttachments(intervention.id);

    await vi.waitFor(() => expect(store.attachmentsCallState().status).toBe('error'));
    expect(store.attachments()).toEqual([attachment]);
  });

  it('reports a missing offline snapshot after a network failure during reload', async () => {
    service.get.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));

    store.reload(intervention.id);

    await vi.waitFor(() => expect(store.loadCallState().status).toBe('error'));
    expect(offline.getWorkspace).toHaveBeenCalledWith(intervention.id);
    expect(store.intervention()).toEqual(intervention);
    expect(store.workItems()).toEqual([workItem]);
  });

  it('preserves planned tasks after a deletion refusal and permits retry', () => {
    service.removeWorkItem.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 412 })),
    );

    store.deleteWorkItems({ interventionId: intervention.id, workItems: [workItem] });

    expect(store.deleteWorkItemsCallState().status).toBe('error');
    expect(store.workItems()).toEqual([workItem]);
    expect(store.intervention()?.workItemsCount).toBe(1);

    store.deleteWorkItems({ interventionId: intervention.id, workItems: [workItem] });

    expect(service.removeWorkItem).toHaveBeenCalledTimes(2);
    expect(store.deleteWorkItemsCallState().status).toBe('success');
    expect(store.workItems()).toEqual([]);
    expect(store.intervention()?.workItemsCount).toBe(0);
  });

  it('keeps a successful task write when the secondary issue refresh fails', () => {
    service.listIssues.mockReturnValueOnce(
      throwError(() => new Error('Issue service unavailable')),
    );
    store.updateWorkItem({
      interventionId: intervention.id,
      item: workItem,
      input: { remainingMinutes: 120 },
    });
    expect(store.workItemWriteCallState().status).toBe('success');
    expect(store.issuesCallState().status).toBe('error');
    expect(store.workItems()[0]?.revision).toBe(2);
  });

  it('removes only the confirmed attachment and unlocks its row on success or refusal', async () => {
    const attachment = { id: 'attachment-1', revision: 4 };
    const other = { id: 'attachment-2', revision: 2 };
    service.listAttachments.mockReturnValueOnce(of({ member: [attachment, other], totalItems: 2 }));
    store.loadAttachments(intervention.id);
    await vi.waitFor(() => expect(store.attachmentsCallState().status).toBe('success'));
    const pending = new Subject<void>();
    service.removeAttachment.mockReturnValueOnce(pending);
    store.removeAttachment({ attachmentId: attachment.id, revision: 4 });
    expect(store.pendingAttachmentIds().has(attachment.id)).toBe(true);
    expect(service.removeAttachment).toHaveBeenCalledExactlyOnceWith(attachment.id, 4);
    pending.next();
    pending.complete();
    expect(store.attachments()).toEqual([other]);
    expect(store.pendingAttachmentIds().size).toBe(0);
    service.removeAttachment.mockReturnValueOnce(
      throwError(() => ({ status: 412, detail: 'Attachment changed' })),
    );
    store.removeAttachment({ attachmentId: other.id, revision: 2 });
    expect(store.attachmentDeleteCallState().status).toBe('error');
    expect(store.attachments()).toEqual([other]);
    expect(store.pendingAttachmentIds().size).toBe(0);
  });
});
