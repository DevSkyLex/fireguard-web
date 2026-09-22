import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ConnectivityService } from '@core/connectivity';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  type CallState,
} from '@core/request-state';
import type {
  WorkloadDayOutput,
  WorkloadOutput,
} from '@features/organization/features/workload/models';
import { WorkloadStore } from '@features/organization/features/workload/state';
import { REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { WorkloadAssigneeIndicator } from '../workload-assignee-indicator.component';

/**
 * Function day
 * @description Supplies independent server totals; draft work is deliberately separate from committed load.
 * @access private
 * @since 1.0.0
 * @param {Partial<WorkloadDayOutput>} overrides - Capacity and completeness scenario.
 * @returns {WorkloadDayOutput} One authorized daily projection.
 */
const day = (overrides: Partial<WorkloadDayOutput> = {}): WorkloadDayOutput => ({
  date: '2026-09-21',
  capacityMinutes: 240,
  actualMinutes: 60,
  remainingMinutes: 120,
  draftMinutes: 900,
  overloadMinutes: 0,
  completeness: 'complete',
  availability: 'available',
  contributions: [],
  ...overrides,
});

/**
 * Function projection
 * @description Builds a member projection without relying on other-member totals.
 * @access private
 * @since 1.0.0
 * @param {readonly WorkloadDayOutput[]} days - Server-returned days.
 * @returns {WorkloadOutput} Workload response fixture.
 */
const projection = (days: readonly WorkloadDayOutput[]): WorkloadOutput => ({
  '@id': '/api/organizations/org-1/workload',
  '@type': 'Workload',
  organizationId: 'org-1',
  canReadTeam: false,
  canManageCapacity: false,
  totalItems: 1,
  page: 1,
  pageSize: 10,
  teams: [],
  memberOptions: [],
  projection: {
    startsOn: '2026-09-21',
    endsOn: '2026-09-22',
    today: '2026-09-21',
    timezone: 'Europe/Paris',
    firstDayOfWeek: 'monday',
    completeness: 'complete',
    calculatedAt: '2026-09-21T09:00:00Z',
    members: [{ memberId: 'member-1', days, unallocated: [] }],
    unassigned: [],
  },
});

describe('WorkloadAssigneeIndicator', () => {
  let fixture: ComponentFixture<WorkloadAssigneeIndicator>;
  const online = signal(true);
  const projectionCallState = signal<CallState<WorkloadOutput | null>>(idleCallState());
  const store = { projectionCallState, load: vi.fn() };

  /**
   * Function createIndicator
   * @description Renders the indicator over a mocked owner store, including its user-visible states.
   * @access private
   * @since 1.0.0
   * @param {boolean} server - Whether Angular suppresses browser render callbacks.
   * @returns {Promise<WorkloadAssigneeIndicator>} Rendered indicator.
   */
  const createIndicator = async (server = false): Promise<WorkloadAssigneeIndicator> => {
    if (server) vi.stubGlobal('ngServerMode', true);
    TestBed.configureTestingModule({
      providers: [
        { provide: ConnectivityService, useValue: { online } },
        {
          provide: REGIONAL_FORMATTING_PORT,
          useValue: { regionalFormatting: signal({ timezone: 'Europe/Paris' }) },
        },
      ],
    }).overrideComponent(WorkloadAssigneeIndicator, {
      set: { providers: [{ provide: WorkloadStore, useValue: store }] },
    });
    fixture = TestBed.createComponent(WorkloadAssigneeIndicator);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.componentRef.setInput('member', '/api/organizations/org-1/members/member-1');
    fixture.componentRef.setInput('startsOn', '2026-09-21');
    fixture.componentRef.setInput('endsOn', '2026-09-22');
    await fixture.whenStable();
    return fixture.componentInstance;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    online.set(true);
    projectionCallState.set(idleCallState());
  });

  afterEach(() => {
    fixture?.destroy();
    vi.unstubAllGlobals();
  });

  it('requests the selected membership and organization-local period after rendering', async () => {
    await createIndicator();
    expect(store.load).toHaveBeenLastCalledWith({
      organizationId: 'org-1',
      member: 'member-1',
      from: '2026-09-21',
      to: '2026-09-22',
    });
  });

  it('keeps authenticated reads disabled during SSR', async () => {
    await createIndicator(true);
    expect(store.load).toHaveBeenCalledExactlyOnceWith(null);
  });

  it.each([
    [null, '2026-09-22'],
    ['2026-09-21', null],
    ['not-a-date', '2026-09-22'],
    ['2026-09-23', '2026-09-22'],
  ])('does not guess a period from %s to %s', async (from, to) => {
    const indicator = await createIndicator();
    fixture.componentRef.setInput('startsOn', from);
    fixture.componentRef.setInput('endsOn', to);
    await fixture.whenStable();
    expect(store.load).toHaveBeenLastCalledWith(null);
    expect(indicator['period']()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Set a work period');
  });

  it('converts timestamp bounds to organization dates and cancels when no member is selected', async () => {
    await createIndicator();
    fixture.componentRef.setInput('startsOn', '2026-09-20T23:30:00Z');
    fixture.componentRef.setInput('endsOn', '2026-09-21T23:30:00Z');
    await fixture.whenStable();
    expect(store.load).toHaveBeenLastCalledWith({
      organizationId: 'org-1',
      member: 'member-1',
      from: '2026-09-21',
      to: '2026-09-22',
    });
    fixture.componentRef.setInput('member', '');
    await fixture.whenStable();
    expect(store.load).toHaveBeenLastCalledWith(null);
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('displays server actual plus remaining work without adding provisional draft demand', async () => {
    const indicator = await createIndicator();
    projectionCallState.set(successCallState(projection([day(), day({ date: '2026-09-22' })])));
    await fixture.whenStable();
    expect(indicator['capacity']()).toBe(480);
    expect(indicator['load']()).toBe(360);
    expect(fixture.nativeElement.textContent).toContain('Current load: 6 h / 8 h');
    expect(fixture.nativeElement.textContent).toContain(
      'The proposed change is checked when you save.',
    );
  });

  it.each([null, undefined])(
    'keeps capacity unknown when a server day has capacity %s',
    async (capacityMinutes) => {
      const indicator = await createIndicator();
      projectionCallState.set(
        successCallState(projection([day(), day({ date: '2026-09-22', capacityMinutes })])),
      );
      await fixture.whenStable();
      expect(indicator['capacity']()).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Current load: 6 h / —');
    },
  );

  it('treats zero capacity as known and no evaluated days as unknown', async () => {
    const indicator = await createIndicator();
    projectionCallState.set(successCallState(projection([day({ capacityMinutes: 0 })])));
    expect(indicator['capacity']()).toBe(0);
    projectionCallState.set(successCallState(projection([])));
    expect(indicator['capacity']()).toBeNull();
    expect(indicator['load']()).toBe(0);
  });

  it('identifies daily overload and unavailability even when other days are available', async () => {
    const indicator = await createIndicator();
    const overloaded = day({ availability: 'overloaded', overloadMinutes: 30 });
    const unavailable = day({
      date: '2026-09-22',
      availability: 'unavailable',
      capacityMinutes: 0,
    });
    const response = projection([overloaded, unavailable, day({ date: '2026-09-23' })]);
    projectionCallState.set(
      successCallState({
        ...response,
        projection: { ...response.projection, completeness: 'partial' },
      }),
    );
    await fixture.whenStable();
    expect(indicator['problemDays']()).toEqual([overloaded, unavailable]);
    expect(fixture.nativeElement.textContent).toContain(
      'Incomplete data: availability cannot be guaranteed.',
    );
    expect(fixture.nativeElement.textContent).toContain('Overload 30 min');
  });

  it('hides cached availability while offline or during a new read, and reports unavailable evaluation on error', async () => {
    const indicator = await createIndicator();
    const response = projection([day()]);
    projectionCallState.set(successCallState(response));
    await fixture.whenStable();
    online.set(false);
    await fixture.whenStable();
    expect(store.load).toHaveBeenLastCalledWith(null);
    expect(indicator['data']()).toBeNull();
    expect(indicator['problemDays']()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Workload cannot be checked offline.');
    online.set(true);
    projectionCallState.set(pendingCallState(response));
    await fixture.whenStable();
    expect(indicator['data']()).toBeNull();
    expect(fixture.nativeElement.querySelector('hlm-skeleton')).not.toBeNull();
    projectionCallState.set(errorCallState(toStoreError(new Error('Unavailable')), response));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Workload evaluation unavailable.');
    projectionCallState.set(successCallState(projection([day()])));
    fixture.componentRef.setInput('member', 'member-other');
    await fixture.whenStable();
    expect(indicator['data']()).toBeNull();
  });
});
