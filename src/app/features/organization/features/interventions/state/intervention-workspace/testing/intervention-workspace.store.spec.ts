import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
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
      remove: vi.fn().mockReturnValue(of(undefined)),
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

  const newest = {
    ...comment,
    '@id': '/api/intervention-activities/activity-9',
    id: 'activity-9',
    body: 'Signed off',
    createdAt: '2026-07-09T00:00:00.000Z',
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

  beforeEach(() => {
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
    expect(store.error()).toBeNull();
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
});

describe('InterventionWorkspaceStore evidence upload', () => {
  let store: InstanceType<typeof InterventionWorkspaceStore>;
  let mockService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
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
});
