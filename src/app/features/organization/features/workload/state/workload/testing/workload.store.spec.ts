import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { WorkloadService } from '@features/organization/features/workload/data-access';
import type {
  WorkloadOutput,
  CapacityOutput,
} from '@features/organization/features/workload/models';
import { WorkloadStore, type WorkloadStoreType } from '../workload.store';
describe('WorkloadStore', () => {
  const response: WorkloadOutput = {
    totalItems: 0,
    page: 1,
    pageSize: 10,
    '@id': '/api/organizations/org/workload',
    '@type': 'Workload',
    organizationId: 'org',
    canReadTeam: true,
    canManageCapacity: true,
    teams: [],
    memberOptions: [],
    projection: {
      startsOn: '2026-09-14',
      endsOn: '2026-09-20',
      today: '2026-09-16',
      timezone: 'Europe/Paris',
      firstDayOfWeek: 'monday',
      members: [],
      unassigned: [],
      completeness: 'unavailable',
      calculatedAt: '2026-09-16T09:00:00Z',
    },
  };
  const query = { organizationId: 'org', from: '2026-09-14', to: '2026-09-20' };
  const capacity: CapacityOutput = {
    '@id': 'capacity',
    '@type': 'Capacity',
    organizationId: 'org',
    configuration: { weeks: [], exceptions: [] },
  };
  let store: WorkloadStoreType;
  let service: {
    read: ReturnType<typeof vi.fn>;
    readCapacity: ReturnType<typeof vi.fn>;
    saveWeek: ReturnType<typeof vi.fn>;
    addException: ReturnType<typeof vi.fn>;
    cancelException: ReturnType<typeof vi.fn>;
  };
  beforeEach(() => {
    service = {
      read: vi.fn().mockReturnValue(of(response)),
      readCapacity: vi.fn().mockReturnValue(of(capacity)),
      saveWeek: vi.fn().mockReturnValue(of({ id: 'week' })),
      addException: vi.fn(),
      cancelException: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [WorkloadStore, { provide: WorkloadService, useValue: service }],
    });
    store = TestBed.inject(WorkloadStore);
  });
  it('cancels obsolete reads so an old week cannot replace the current one', () => {
    const old = new Subject<WorkloadOutput>(),
      latest = new Subject<WorkloadOutput>();
    service.read.mockReturnValueOnce(old).mockReturnValueOnce(latest);
    store.load(query);
    expect(store.projectionCallState().status).toBe('pending');
    store.load({ ...query, from: '2026-09-21', to: '2026-09-27' });
    expect(old.observed).toBe(false);
    latest.next(response);
    expect(store.projectionCallState()).toMatchObject({ status: 'success', data: response });
  });
  it('keeps capacity drafts and authorized context when projection reads are suspended', () => {
    store.load(query);
    store.loadCapacity({ organizationId: 'org', memberId: null });
    store.load(null);
    expect(store.projectionCallState().status).toBe('idle');
    expect(store.projectionCallState().data).toEqual(response);
    expect(store.capacityCallState().data).toEqual(capacity);
  });
  it('clears the previous organization before another one responds', () => {
    store.load(query);
    store.loadCapacity({ organizationId: 'org', memberId: null });
    service.read.mockReturnValueOnce(new Subject<WorkloadOutput>());
    store.load({ ...query, organizationId: 'different' });
    expect(store.projectionCallState().data).toBeNull();
    expect(store.capacityCallState().data).toBeNull();
  });
  it('retains the submitted scope and surfaces a factual write error', () => {
    store.load(query);
    service.saveWeek.mockReturnValueOnce(
      throwError(() => ({ status: 422, detail: 'Conflicting date' })),
    );
    store.saveCapacity({
      kind: 'week',
      organizationId: 'org',
      memberId: null,
      input: { effectiveOn: '2026-09-16', minutes: [0, 0, 0, 0, 0, 0, 0] },
    });
    expect(store.capacityWriteCallState().status).toBe('error');
    expect(store.projectionCallState().data).toEqual(response);
  });
  it('does not let a late write completion reload another organization', () => {
    const pending = new Subject<unknown>();
    store.load(query);
    service.saveWeek.mockReturnValueOnce(pending);
    store.saveCapacity({
      kind: 'week',
      organizationId: 'org',
      memberId: null,
      input: { effectiveOn: '2026-09-16', minutes: [0, 0, 0, 0, 0, 0, 0] },
    });
    store.load({ ...query, organizationId: 'different' });
    service.read.mockClear();
    pending.next({ id: 'week' });
    expect(service.read).not.toHaveBeenCalled();
    expect(store.capacityWriteCallState().status).toBe('idle');
  });
});
