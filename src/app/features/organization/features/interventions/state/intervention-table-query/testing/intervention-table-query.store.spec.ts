import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import {
  InterventionService,
  InterventionOfflineService,
} from '@features/organization/features/interventions/data-access';
import type {
  InterventionChangeOutput,
  InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';
import { InterventionTableQueryStore } from '../intervention-table-query.store';

describe('InterventionTableQueryStore', () => {
  const workItem = { id: 'work-1' } as InterventionWorkItemOutput;
  const change = { id: 'change-1' } as InterventionChangeOutput;
  let service: {
    listAllWorkItems: ReturnType<typeof vi.fn>;
    listAllChanges: ReturnType<typeof vi.fn>;
  };
  let store: InstanceType<typeof InterventionTableQueryStore>;
  const offline = { getWorkspace: vi.fn(), listOutbox: vi.fn() };

  beforeEach(() => {
    vi.useFakeTimers();
    service = {
      listAllWorkItems: vi.fn().mockReturnValue(of([workItem])),
      listAllChanges: vi.fn().mockReturnValue(of([change])),
    };
    offline.getWorkspace.mockReset().mockResolvedValue(null);
    offline.listOutbox.mockReset().mockResolvedValue([]);
    TestBed.configureTestingModule({
      providers: [
        InterventionTableQueryStore,
        { provide: InterventionService, useValue: service },
        { provide: InterventionOfflineService, useValue: offline },
      ],
    });
    store = TestBed.inject(InterventionTableQueryStore);
  });

  afterEach(() => vi.useRealTimers());

  it('uses the complete saved snapshot and local operations offline, never the API', async () => {
    offline.getWorkspace.mockResolvedValue({
      intervention: { id: 'A' },
      workItems: [
        {
          ...workItem,
          intervention: '/api/interventions/A',
          action: 'inventory',
          status: 'planned',
          targetSummary: { label: 'Pump' },
        },
      ],
      changes: [],
      issues: [],
    });
    offline.listOutbox.mockResolvedValue([
      {
        id: 'op',
        interventionId: 'A',
        type: 'work-item.update',
        payload: { workItemId: workItem.id, status: 'completed' },
        createdAt: '2026-09-15',
      },
    ]);
    store.setOffline(true);
    store.activateWorkItems('A', { search: '', statuses: ['planned', 'in_progress'] });
    await vi.advanceTimersByTimeAsync(0);
    expect(service.listAllWorkItems).not.toHaveBeenCalled();
    expect(store.workItems()).toEqual([]);
    expect(store.workItemsSource()).toBe('saved');
    store.loadWorkItems({ interventionId: 'A', search: 'pump', statuses: null });
    await vi.advanceTimersByTimeAsync(300);
    expect(store.workItems()).toHaveLength(1);
  });

  it('reports unavailable offline data instead of a false empty result and retries on reconnect', async () => {
    store.setOffline(true);
    store.activateChanges('A', { search: '', status: 'proposed' });
    await vi.advanceTimersByTimeAsync(0);
    expect(store.changesError()).not.toBeNull();
    expect(store.changes()).toBeNull();
    expect(store.changesSource()).toBe('unavailable');
    store.setOffline(false);
    expect(service.listAllChanges).toHaveBeenCalledTimes(1);
    expect(store.changesSource()).toBe('api');
  });

  it('keeps prior rows after a refresh error and retries identical criteria', () => {
    store.activateWorkItems('A', { search: '', statuses: null });
    service.listAllWorkItems.mockReturnValueOnce(throwError(() => new Error('refresh failed')));
    store.refreshWorkItems();
    expect(store.workItems()).toEqual([workItem]);
    expect(store.workItemsError()).not.toBeNull();
    store.retryWorkItems();
    expect(store.workItemsError()).toBeNull();
  });

  it('forces retry and refresh with identical criteria', () => {
    service.listAllWorkItems.mockReturnValueOnce(throwError(() => new Error('failed')));
    store.activateWorkItems('A', { search: 'pump', statuses: ['planned'] });
    expect(store.workItemsError()).not.toBeNull();
    store.retryWorkItems();
    store.refreshWorkItems();
    expect(service.listAllWorkItems).toHaveBeenCalledTimes(3);
    expect(store.workItemsQuery()).toEqual({ search: 'pump', statuses: ['planned'] });
  });

  it('reconciles create, completion and deletion under the retained Remaining criteria', () => {
    const initial = {
      ...workItem,
      intervention: '/api/interventions/A',
      status: 'planned',
    } as InterventionWorkItemOutput;
    let rows = [initial];
    service.listAllWorkItems.mockImplementation(() => of(rows));
    store.activateWorkItems('A', { search: '', statuses: ['planned', 'in_progress'] });
    const created = { ...initial, id: 'created' };
    rows = [initial, created];
    store.reconcileWorkItem(created);
    expect(store.workItems()).toEqual([initial]);
    store.invalidate('A', ['workItems']);
    expect(store.workItems()).toEqual(rows);
    store.reconcileWorkItem({ ...initial, status: 'completed' });
    rows = [created];
    store.invalidate('A', ['workItems']);
    expect(store.workItems()).toEqual([created]);
    store.removeWorkItems('A', [created.id]);
    rows = [];
    store.invalidate('A', ['workItems']);
    expect(store.workItems()).toEqual([]);
    expect(store.workItemsQuery().statuses).toEqual(['planned', 'in_progress']);
    expect(service.listAllWorkItems).toHaveBeenCalledTimes(4);
  });

  it('reconciles a rejection then lets the API recompute Proposed membership', () => {
    const proposed = {
      ...change,
      intervention: '/api/interventions/A',
      status: 'proposed',
    } as InterventionChangeOutput;
    service.listAllChanges.mockReturnValueOnce(of([proposed])).mockReturnValueOnce(of([]));
    store.activateChanges('A', { search: '', status: 'proposed' });
    store.reconcileChange({ ...proposed, status: 'rejected' });
    expect(store.changes()?.[0]?.status).toBe('rejected');
    store.invalidate('A', ['changes']);
    expect(store.changes()).toEqual([]);
    expect(store.changesQuery().status).toBe('proposed');
  });

  it('retains per-tab criteria and resets them only for a new intervention', async () => {
    store.activateWorkItems('A', { search: '', statuses: ['planned', 'in_progress'] });
    store.loadWorkItems({
      interventionId: 'A',
      search: 'pump',
      statuses: ['planned', 'in_progress'],
    });
    await vi.advanceTimersByTimeAsync(300);
    store.activateChanges('A', { search: '', status: 'proposed' });
    store.activateWorkItems('A', { search: '', statuses: null });
    expect(store.workItemsQuery().search).toBe('pump');
    expect(service.listAllWorkItems).toHaveBeenCalledTimes(2);
    store.activateWorkItems('B', { search: '', statuses: null });
    expect(store.workItemsQuery().search).toBe('');
    expect(store.changesVisited()).toBe(false);
  });

  it('refreshes active invalidations and defers inactive ones until activation', () => {
    store.activateWorkItems('A', { search: '', statuses: null });
    store.activateChanges('A', { search: '', status: 'proposed' });
    store.invalidate('A', ['workItems', 'changes']);
    expect(service.listAllWorkItems).toHaveBeenCalledTimes(1);
    expect(service.listAllChanges).toHaveBeenCalledTimes(2);
    store.activateWorkItems('A', { search: '', statuses: null });
    expect(service.listAllWorkItems).toHaveBeenCalledTimes(2);
  });

  it('cancels an obsolete work response before the next search debounce elapses', async () => {
    const old = new Subject<readonly InterventionWorkItemOutput[]>();
    service.listAllWorkItems.mockReturnValueOnce(old);
    store.loadWorkItems({ interventionId: 'A', search: '', statuses: null });
    store.loadWorkItems({ interventionId: 'A', search: 'pump', statuses: null });
    old.next([workItem]);
    expect(store.workItems()).toBeNull();
    expect(old.observed).toBe(false);
    await vi.advanceTimersByTimeAsync(300);
    expect(store.workItems()).toEqual([workItem]);
  });

  it('cancels changes immediately while the next text query is debouncing', () => {
    const old = new Subject<readonly InterventionChangeOutput[]>();
    service.listAllChanges.mockReturnValueOnce(old);
    store.loadChanges({ interventionId: 'A', search: '', status: 'proposed' });
    store.loadChanges({ interventionId: 'A', search: 'location', status: 'proposed' });
    old.error(new Error('obsolete failure'));
    expect(store.changesError()).toBeNull();
    expect(store.changesLoading()).toBe(true);
  });

  it('cancels every collection belonging to A when B becomes current', () => {
    const old = new Subject<readonly InterventionChangeOutput[]>();
    service.listAllChanges.mockReturnValueOnce(old);
    store.loadChanges({ interventionId: 'A', search: '', status: 'proposed' });
    store.loadWorkItems({ interventionId: 'B', search: '', statuses: null });
    old.next([change]);
    expect(store.changes()).toBeNull();
    expect(old.observed).toBe(false);
  });

  it('applies a status change immediately even when search is nonempty', async () => {
    store.loadChanges({ interventionId: 'A', search: 'rack', status: 'proposed' });
    await vi.advanceTimersByTimeAsync(300);
    service.listAllChanges.mockClear();
    store.loadChanges({ interventionId: 'A', search: 'rack', status: 'rejected' });
    expect(service.listAllChanges).toHaveBeenCalledWith('A', {
      search: 'rack',
      status: 'rejected',
    });
  });

  it('debounces and forwards the work-item server query', async () => {
    store.loadWorkItems({
      interventionId: 'intervention-1',
      search: ' pump ',
      statuses: ['planned', 'in_progress'],
    });

    expect(service.listAllWorkItems).not.toHaveBeenCalled();
    expect(store.workItemsLoading()).toBe(true);
    await vi.advanceTimersByTimeAsync(300);

    expect(service.listAllWorkItems).toHaveBeenCalledWith('intervention-1', {
      search: 'pump',
      status: ['planned', 'in_progress'],
    });
    expect(store.workItems()).toEqual([workItem]);
  });

  it('keeps only the latest debounced change query', async () => {
    store.loadChanges({ interventionId: 'intervention-1', search: 'old', status: 'proposed' });
    store.loadChanges({ interventionId: 'intervention-1', search: 'new', status: 'proposed' });

    expect(store.changesLoading()).toBe(true);
    await vi.advanceTimersByTimeAsync(300);

    expect(service.listAllChanges).toHaveBeenCalledTimes(1);
    expect(service.listAllChanges).toHaveBeenCalledWith('intervention-1', {
      search: 'new',
      status: 'proposed',
    });
    expect(store.changes()).toEqual([change]);
  });
});
