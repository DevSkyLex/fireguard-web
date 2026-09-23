import { HttpErrorResponse } from '@angular/common/http';
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
    listWorkItems: ReturnType<typeof vi.fn>;
    listAllChanges: ReturnType<typeof vi.fn>;
  };
  let store: InstanceType<typeof InterventionTableQueryStore>;
  const offline = { getWorkspace: vi.fn(), listOutbox: vi.fn() };

  beforeEach(() => {
    vi.useFakeTimers();
    service = {
      listWorkItems: vi.fn().mockReturnValue(of({ member: [workItem], totalItems: 1 })),
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

  it('loads only the requested page and retains its total independently of row count', () => {
    service.listWorkItems.mockReturnValue(of({ member: [workItem], totalItems: 32 }));
    store.loadWorkItems({
      interventionId: 'A',
      search: '',
      statuses: ['planned', 'in_progress'],
      page: 2,
      itemsPerPage: 10,
      prioritizeAssignee: '/members/me',
    });
    expect(service.listWorkItems).toHaveBeenCalledTimes(1);
    expect(service.listWorkItems).toHaveBeenCalledWith('A', {
      search: undefined,
      status: ['planned', 'in_progress'],
      page: 2,
      itemsPerPage: 10,
      prioritizeAssignee: '/members/me',
    });
    expect(store.workItems()).toEqual([workItem]);
    expect(store.workItemsTotal()).toBe(32);
    expect(store.workItemsPage()).toBe(2);
  });

  it('retains rendered pagination on failure and retries the requested page', () => {
    service.listWorkItems.mockReturnValueOnce(of({ member: [workItem], totalItems: 32 }));
    store.activateWorkItems('A', { search: '', statuses: null });
    service.listWorkItems.mockReturnValueOnce(throwError(() => new Error('page failed')));
    store.loadWorkItems({ interventionId: 'A', search: '', statuses: null, page: 2 });
    expect(store.workItemsPage()).toBe(1);
    expect(store.workItemsTotal()).toBe(32);
    service.listWorkItems.mockReturnValueOnce(of({ member: [], totalItems: 32 }));
    store.retryWorkItems();
    expect(store.workItemsPage()).toBe(2);
    expect(service.listWorkItems).toHaveBeenLastCalledWith(
      'A',
      expect.objectContaining({ page: 2 }),
    );
  });

  it('clamps an invalidated last page after a deletion', () => {
    service.listWorkItems
      .mockReturnValueOnce(of({ member: [], totalItems: 20 }))
      .mockReturnValueOnce(of({ member: [workItem], totalItems: 20 }));
    store.loadWorkItems({ interventionId: 'A', search: '', statuses: null, page: 3 });
    expect(service.listWorkItems).toHaveBeenCalledTimes(2);
    expect(store.workItemsQuery().page).toBe(2);
    expect(store.workItemsPage()).toBe(2);
    expect(store.workItems()).toEqual([workItem]);
  });

  it('limits a requested page size and recovers the last available page', () => {
    service.listWorkItems
      .mockReturnValueOnce(of({ member: [], totalItems: 150 }))
      .mockReturnValueOnce(of({ member: [workItem], totalItems: 150 }));

    store.loadWorkItems({
      interventionId: 'A',
      search: '',
      statuses: null,
      page: 999,
      itemsPerPage: 500,
    });

    expect(service.listWorkItems).toHaveBeenNthCalledWith(
      1,
      'A',
      expect.objectContaining({ page: 999, itemsPerPage: 100 }),
    );
    expect(service.listWorkItems).toHaveBeenNthCalledWith(
      2,
      'A',
      expect.objectContaining({ page: 2, itemsPerPage: 100 }),
    );
    expect(store.workItemsPage()).toBe(2);
    expect(store.workItemsPageSize()).toBe(100);
    expect(store.workItems()).toEqual([workItem]);
  });

  it('cancels obsolete page requests when pagination changes', () => {
    const obsolete = new Subject<{ member: InterventionWorkItemOutput[]; totalItems: number }>();
    service.listWorkItems
      .mockReturnValueOnce(obsolete)
      .mockReturnValueOnce(of({ member: [workItem], totalItems: 32 }));
    store.loadWorkItems({ interventionId: 'A', search: '', statuses: null });
    store.loadWorkItems({ interventionId: 'A', search: '', statuses: null, page: 2 });
    expect(obsolete.observed).toBe(false);
    obsolete.next({ member: [], totalItems: 0 });
    expect(store.workItemsTotal()).toBe(32);
    expect(store.workItemsPage()).toBe(2);
  });

  it('filters and prioritizes the complete saved snapshot before slicing its page', async () => {
    offline.getWorkspace.mockResolvedValue({
      intervention: { id: 'A' },
      workItems: Array.from({ length: 23 }, (_, index) => ({
        ...workItem,
        id: String(index).padStart(2, '0'),
        status: index === 22 ? 'completed' : 'planned',
        updatedAt: '2026-09-16',
        assignee: index > 15 ? '/members/me' : null,
      })),
      changes: [],
      issues: [],
    });
    store.setOffline(true);
    store.loadWorkItems({
      interventionId: 'A',
      search: '',
      statuses: ['planned'],
      page: 1,
      prioritizeAssignee: '/members/me',
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(store.workItemsTotal()).toBe(22);
    expect(store.workItems()?.map((item) => item.id)).toEqual([
      '16',
      '17',
      '18',
      '19',
      '20',
      '21',
      '00',
      '01',
      '02',
      '03',
    ]);
    store.loadWorkItems({
      interventionId: 'A',
      search: '',
      statuses: ['planned'],
      page: 3,
      prioritizeAssignee: '/members/me',
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(store.workItems()?.map((item) => item.id)).toEqual(['14', '15']);
    expect(service.listWorkItems).not.toHaveBeenCalled();
  });

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
    expect(service.listWorkItems).not.toHaveBeenCalled();
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

  it('uses saved work and change rows after a transport failure without marking them unavailable', async () => {
    const savedItem = {
      ...workItem,
      intervention: '/api/interventions/A',
      status: 'planned',
      action: 'inventory',
      updatedAt: '2026-09-16',
    } as InterventionWorkItemOutput;
    const savedChange = {
      ...change,
      intervention: '/api/interventions/A',
      status: 'proposed',
      patch: { name: 'Pump room' },
    } as InterventionChangeOutput;
    offline.getWorkspace.mockResolvedValue({
      intervention: { id: 'A' },
      workItems: [savedItem],
      changes: [savedChange],
      issues: [],
    });
    const networkFailure = new HttpErrorResponse({ status: 0 });
    service.listWorkItems.mockReturnValue(throwError(() => networkFailure));
    service.listAllChanges.mockReturnValue(throwError(() => networkFailure));

    store.activateWorkItems('A', { search: '', statuses: ['planned'] });
    await vi.advanceTimersByTimeAsync(0);
    expect(store.workItems()).toEqual([savedItem]);
    expect(store.workItemsSource()).toBe('saved');
    expect(store.workItemsError()).toBeNull();

    store.activateChanges('A', { search: '', status: 'proposed' });
    await vi.advanceTimersByTimeAsync(0);
    expect(store.changes()).toEqual([savedChange]);
    expect(store.changesSource()).toBe('saved');
    expect(store.changesError()).toBeNull();
    expect(service.listWorkItems).toHaveBeenCalledTimes(1);
    expect(service.listAllChanges).toHaveBeenCalledTimes(1);
  });

  it('retains the visible change history when a non-network refresh fails', () => {
    store.activateChanges('A', { search: '', status: 'proposed' });
    service.listAllChanges.mockReturnValueOnce(throwError(() => new Error('Server rejected')));

    store.refreshChanges();

    expect(store.changes()).toEqual([change]);
    expect(store.changesSource()).toBe('api');
    expect(store.changesError()?.message).toContain('Server rejected');
  });

  it('keeps prior rows after a refresh error and retries identical criteria', () => {
    store.activateWorkItems('A', { search: '', statuses: null });
    service.listWorkItems.mockReturnValueOnce(throwError(() => new Error('refresh failed')));
    store.refreshWorkItems();
    expect(store.workItems()).toEqual([workItem]);
    expect(store.workItemsError()).not.toBeNull();
    store.retryWorkItems();
    expect(store.workItemsError()).toBeNull();
  });

  it('forces retry and refresh with identical criteria', () => {
    service.listWorkItems.mockReturnValueOnce(throwError(() => new Error('failed')));
    store.activateWorkItems('A', { search: 'pump', statuses: ['planned'] });
    expect(store.workItemsError()).not.toBeNull();
    store.retryWorkItems();
    store.refreshWorkItems();
    expect(service.listWorkItems).toHaveBeenCalledTimes(3);
    expect(store.workItemsQuery()).toMatchObject({ search: 'pump', statuses: ['planned'] });
  });

  it('reconciles create, completion and deletion under the retained Remaining criteria', () => {
    const initial = {
      ...workItem,
      intervention: '/api/interventions/A',
      status: 'planned',
    } as InterventionWorkItemOutput;
    let rows = [initial];
    service.listWorkItems.mockImplementation(() => of({ member: rows, totalItems: rows.length }));
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
    expect(service.listWorkItems).toHaveBeenCalledTimes(4);
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

  it('ignores late row mutations and invalidations from the previous intervention', () => {
    const aWork = {
      ...workItem,
      intervention: '/api/interventions/A',
      status: 'planned',
    } as InterventionWorkItemOutput;
    const bWork = { ...aWork, intervention: '/api/interventions/B' };
    const aChange = {
      ...change,
      intervention: '/api/interventions/A',
      status: 'proposed',
    } as InterventionChangeOutput;
    const bChange = { ...aChange, intervention: '/api/interventions/B' };
    service.listWorkItems.mockImplementation((id: string) =>
      of({ member: [id === 'A' ? aWork : bWork], totalItems: 1 }),
    );
    service.listAllChanges.mockImplementation((id: string) => of([id === 'A' ? aChange : bChange]));
    store.activateWorkItems('A', { search: '', statuses: null });
    store.activateChanges('A', { search: '', status: 'proposed' });
    store.activateWorkItems('B', { search: '', statuses: null });
    store.activateChanges('B', { search: '', status: 'proposed' });
    service.listWorkItems.mockClear();
    service.listAllChanges.mockClear();

    store.invalidate('A', ['workItems', 'changes']);
    store.reconcileWorkItem({ ...aWork, status: 'completed' });
    store.reconcileChange({ ...aChange, status: 'rejected' });
    store.removeWorkItems('A', [aWork.id]);

    expect(service.listWorkItems).not.toHaveBeenCalled();
    expect(service.listAllChanges).not.toHaveBeenCalled();
    expect(store.workItems()).toEqual([bWork]);
    expect(store.changes()).toEqual([bChange]);
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
    expect(service.listWorkItems).toHaveBeenCalledTimes(2);
    store.activateWorkItems('B', { search: '', statuses: null });
    expect(store.workItemsQuery().search).toBe('');
    expect(store.changesVisited()).toBe(false);
  });

  it('refreshes active invalidations and defers inactive ones until activation', () => {
    store.activateWorkItems('A', { search: '', statuses: null });
    store.activateChanges('A', { search: '', status: 'proposed' });
    store.invalidate('A', ['workItems', 'changes']);
    expect(service.listWorkItems).toHaveBeenCalledTimes(1);
    expect(service.listAllChanges).toHaveBeenCalledTimes(2);
    store.activateWorkItems('A', { search: '', statuses: null });
    expect(service.listWorkItems).toHaveBeenCalledTimes(2);
  });

  it('cancels an obsolete work response before the next search debounce elapses', async () => {
    const old = new Subject<{ member: InterventionWorkItemOutput[]; totalItems: number }>();
    service.listWorkItems.mockReturnValueOnce(old);
    store.loadWorkItems({ interventionId: 'A', search: '', statuses: null });
    store.loadWorkItems({ interventionId: 'A', search: 'pump', statuses: null });
    old.next({ member: [workItem], totalItems: 1 });
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

    expect(service.listWorkItems).not.toHaveBeenCalled();
    expect(store.workItemsLoading()).toBe(true);
    await vi.advanceTimersByTimeAsync(300);

    expect(service.listWorkItems).toHaveBeenCalledWith('intervention-1', {
      search: 'pump',
      status: ['planned', 'in_progress'],
      page: 1,
      itemsPerPage: 10,
      prioritizeAssignee: undefined,
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
