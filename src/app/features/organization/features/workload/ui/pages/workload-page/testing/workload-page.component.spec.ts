import { LOCALE_ID, PLATFORM_ID, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Events } from '@ngrx/signals/events';
import { DateTime } from 'luxon';
import { Subject } from 'rxjs';
import { ConnectivityService } from '@core/connectivity';
import { idleCallState, successCallState, type CallState } from '@core/request-state';
import type {
  WorkloadDaySelection,
  WorkloadOutput,
} from '@features/organization/features/workload/models';
import { WorkloadStore, workloadStoreEvents } from '@features/organization/features/workload/state';
import { ORGANIZATION_CONTEXT_PORT, REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { WorkloadPage } from '../workload-page.component';

/**
 * Function projection
 * @description Builds a server projection without deriving totals from the displayed member page.
 * @access private
 * @since 1.0.0
 * @param {Partial<WorkloadOutput>} overrides - Response fields for the scenario.
 * @returns {WorkloadOutput} Authorized projection fixture.
 */
const projection = (overrides: Partial<WorkloadOutput> = {}): WorkloadOutput => ({
  '@id': '/api/organizations/org-1/workload',
  '@type': 'Workload',
  organizationId: 'org-1',
  totalItems: 31,
  page: 1,
  pageSize: 10,
  canReadTeam: true,
  canManageCapacity: true,
  memberOptions: [
    { id: 'member-1', name: 'Marie Lefèvre', avatarUrl: null, roleNames: ['Inspector'] },
  ],
  teams: [{ id: 'team-1', name: 'Inspection team' }],
  projection: {
    startsOn: '2026-09-21',
    endsOn: '2026-09-27',
    today: '2026-09-21',
    timezone: 'Europe/Paris',
    firstDayOfWeek: 'monday',
    members: [],
    unassigned: [],
    completeness: 'partial',
    calculatedAt: '2026-09-20T23:30:00Z',
  },
  ...overrides,
});

/**
 * Function selectedDay
 * @description Supplies an unknown-capacity day without replacing unknown values with zero.
 * @access private
 * @since 1.0.0
 * @returns {WorkloadDaySelection} A selected member and day.
 */
const selectedDay = (): WorkloadDaySelection => ({
  member: { memberId: 'member-1', days: [], unallocated: [] },
  day: {
    date: '2026-09-21',
    capacityMinutes: null,
    actualMinutes: 60,
    remainingMinutes: 120,
    draftMinutes: 0,
    completeness: 'partial',
    availability: 'unknown',
    contributions: [],
  },
});

describe('WorkloadPage', () => {
  let fixture: ComponentFixture<WorkloadPage>;
  const online = signal(true);
  const projectionCallState = signal<CallState<WorkloadOutput | null>>(idleCallState());
  const organization = signal<{
    settings: { regional: { firstDayOfWeek: 'monday' | 'sunday' } };
  } | null>(null);
  const regionalFormatting = signal({ timezone: 'Europe/Paris' });
  const store = { projectionCallState, load: vi.fn(), loadCapacity: vi.fn() };
  let saved: Subject<ReturnType<typeof workloadStoreEvents.capacitySaved>>;

  /**
   * Function createPage
   * @description Instantiates page orchestration over mocked stores, without rendering child workflows.
   * @access private
   * @since 1.0.0
   * @param {'browser' | 'server'} platform - Browser read boundary.
   * @returns {Promise<WorkloadPage>} Settled page instance.
   */
  const createPage = async (platform: 'browser' | 'server' = 'browser'): Promise<WorkloadPage> => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: platform },
        { provide: LOCALE_ID, useValue: 'en-US' },
        { provide: ConnectivityService, useValue: { online } },
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: { selectedOrganization: organization } },
        { provide: REGIONAL_FORMATTING_PORT, useValue: { regionalFormatting } },
        { provide: Events, useValue: { on: vi.fn().mockReturnValue(saved) } },
      ],
    }).overrideComponent(WorkloadPage, {
      set: {
        template:
          '<ng-template #memberChip /><ng-template #teamChip /><ng-template #overloadChip />',
        imports: [],
        providers: [{ provide: WorkloadStore, useValue: store }],
      },
    });
    fixture = TestBed.createComponent(WorkloadPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    await fixture.whenStable();
    return fixture.componentInstance;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    online.set(true);
    projectionCallState.set(idleCallState());
    organization.set(null);
    regionalFormatting.set({ timezone: 'Europe/Paris' });
    saved = new Subject();
    const now = DateTime.fromISO('2026-09-20T23:30:00Z');
    if (!now.isValid) throw new Error('Invalid test clock');
    vi.spyOn(DateTime, 'now').mockReturnValue(now);
  });

  afterEach(() => vi.restoreAllMocks());

  it('loads the organization-local week once and keeps authenticated reads out of SSR', async () => {
    await createPage('server');
    expect(store.load).not.toHaveBeenCalled();
  });

  it('uses the organization timezone and falls back to Monday for its initial window', async () => {
    const page = await createPage();
    expect(store.load).toHaveBeenCalledExactlyOnceWith({
      organizationId: 'org-1',
      from: '2026-09-21',
      to: '2026-09-27',
      page: 1,
      pageSize: 10,
    });
    expect(page['calculatedAt']()).toBe('');
    expect(page['memberOptions']()).toEqual([]);
    expect(page['teamOptions']()).toEqual([]);
    expect(page['selectedIdentity']()).toBeNull();
    expect(page['pageCount']()).toBe(1);
    expect(Object.values(page['chipTemplates']()).every(Boolean)).toBe(true);
  });

  it('honors a Sunday week start and returns from adjacent weeks to the current week', async () => {
    organization.set({ settings: { regional: { firstDayOfWeek: 'sunday' } } });
    const page = await createPage();
    expect(page['query']()).toMatchObject({ from: '2026-09-20', to: '2026-09-26' });
    page['selectedDay'].set(selectedDay());
    page['changePage'](3);
    page['stepWeek'](-1);
    await fixture.whenStable();
    expect(store.load).toHaveBeenLastCalledWith(
      expect.objectContaining({ from: '2026-09-13', to: '2026-09-19', page: 1 }),
    );
    expect(page['selectedDay']()).toBeNull();
    page['currentWeek']();
    await fixture.whenStable();
    expect(page['query']()).toMatchObject({ from: '2026-09-20', page: 1 });
  });

  it('requests all supported filters from the server and resets pagination and stale selections', async () => {
    const page = await createPage();
    page['changePage'](3);
    page['selectedDay'].set(selectedDay());
    page['filterStateChanged']('member', 'open');
    page['setFilter']('member', 'member-1');
    page['setFilter']('team', 'team-1');
    page['setFilter']('overloaded', 'overloaded');
    await fixture.whenStable();
    expect(store.load).toHaveBeenLastCalledWith(
      expect.objectContaining({ member: 'member-1', team: 'team-1', overloaded: true, page: 1 }),
    );
    expect(page['activeFilterKeys']()).toEqual(['member', 'team', 'overloaded']);
    expect(page['selectedDay']()).toBeNull();
    expect(page['openFilterKey']()).toBeNull();
    page['clearFilters']();
    await fixture.whenStable();
    expect(page['activeFilterKeys']()).toEqual([]);
    expect(page['query']()).not.toHaveProperty('member');
    expect(page['query']()).not.toHaveProperty('team');
    expect(page['query']()).not.toHaveProperty('overloaded');
  });

  it('ignores unknown filters and keeps another filter open when an old picker closes', async () => {
    const page = await createPage();
    page['changePage'](2);
    page['setFilter']('unsupported', 'value');
    expect(page['query']().page).toBe(2);
    page['filterStateChanged']('member', 'open');
    page['filterStateChanged']('team', 'open');
    page['filterStateChanged']('member', 'closed');
    expect(page['openFilterKey']()).toBe('team');
    page['filterStateChanged']('team', 'closed');
    expect(page['openFilterKey']()).toBeNull();
  });

  it('uses server totals and authorized identities rather than totals from the displayed rows', async () => {
    const page = await createPage();
    projectionCallState.set(successCallState(projection()));
    expect(page['pageCount']()).toBe(4);
    expect(page['filterFields']().map((field) => field.key)).toEqual([
      'member',
      'team',
      'overloaded',
    ]);
    expect(page['memberOptions']()).toEqual([
      expect.objectContaining({ value: 'member-1', label: 'Marie Lefèvre' }),
    ]);
    expect(page['teamOptions']()).toEqual([{ value: 'team-1', label: 'Inspection team' }]);
    page['selectedDay'].set(selectedDay());
    expect(page['selectedIdentity']()).toEqual(page['memberOptions']()[0]);
    expect(page['calculatedAt']()).toBe('Sep 21, 2026, 1:30 AM');
    page['changePage'](3);
    await fixture.whenStable();
    expect(store.load).toHaveBeenLastCalledWith(expect.objectContaining({ page: 3 }));
    page['changePageSize'](25);
    await fixture.whenStable();
    expect(store.load).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, pageSize: 25 }));
    expect(page['pageCount']()).toBe(2);
  });

  it('offers only the load filter without team visibility and hides a different organization response', async () => {
    const page = await createPage();
    projectionCallState.set(successCallState(projection({ canReadTeam: false })));
    expect(page['filterFields']().map((field) => field.key)).toEqual(['overloaded']);
    projectionCallState.set(successCallState(projection({ organizationId: 'org-other' })));
    expect(page['data']()).toBeNull();
    expect(page['memberOptions']()).toEqual([]);
  });

  it('suspends reads offline, prevents retry and capacity editing, then resumes the same window', async () => {
    const page = await createPage();
    projectionCallState.set(successCallState(projection()));
    online.set(false);
    await fixture.whenStable();
    expect(store.load).toHaveBeenLastCalledWith(null);
    store.load.mockClear();
    page['reload']();
    page['openCapacity']('member-1');
    expect(store.load).not.toHaveBeenCalled();
    expect(page['capacityOpen']()).toBe(false);
    online.set(true);
    await fixture.whenStable();
    expect(store.load).toHaveBeenCalledExactlyOnceWith(page['query']());
    page['reload']();
    expect(store.load).toHaveBeenCalledTimes(2);
  });

  it('requires the capacity capability and closes only on a completion in the current organization', async () => {
    const page = await createPage();
    page['openCapacity']('member-1');
    expect(page['capacityOpen']()).toBe(false);
    projectionCallState.set(successCallState(projection({ canManageCapacity: false })));
    page['openCapacity']('member-1');
    expect(page['capacityOpen']()).toBe(false);
    projectionCallState.set(successCallState(projection()));
    page['openCapacity']('member-1');
    expect(page['capacityOpen']()).toBe(true);
    expect(page['capacityMemberId']()).toBe('member-1');
    saved.next(workloadStoreEvents.capacitySaved({ organizationId: 'other', memberId: null }));
    expect(page['capacityOpen']()).toBe(true);
    saved.next(
      workloadStoreEvents.capacitySaved({ organizationId: 'org-1', memberId: 'member-1' }),
    );
    expect(page['capacityOpen']()).toBe(false);
    expect(store.loadCapacity).toHaveBeenCalledExactlyOnceWith(null);
  });

  it('clears scoped filters and details when route organization changes and unsubscribes on destruction', async () => {
    const page = await createPage();
    projectionCallState.set(successCallState(projection()));
    page['setFilter']('member', 'member-1');
    page['setFilter']('team', 'team-1');
    page['setFilter']('overloaded', 'overloaded');
    page['stepWeek'](1);
    page['changePage'](2);
    page['selectedDay'].set(selectedDay());
    page['openCapacity']('member-1');
    fixture.componentRef.setInput('organizationId', 'org-2');
    await fixture.whenStable();
    expect(store.load).toHaveBeenLastCalledWith({
      organizationId: 'org-2',
      from: '2026-09-21',
      to: '2026-09-27',
      page: 1,
      pageSize: 10,
    });
    expect(page['data']()).toBeNull();
    expect(page['selectedDay']()).toBeNull();
    expect(page['capacityOpen']()).toBe(false);
    fixture.destroy();
    expect(saved.observed).toBe(false);
  });
});
