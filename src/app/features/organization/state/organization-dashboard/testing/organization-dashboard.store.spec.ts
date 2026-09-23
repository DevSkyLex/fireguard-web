import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { OrganizationService } from '@features/organization/data-access';
import type {
  OrganizationDashboardOutput,
  OrganizationOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { DashboardStore } from '../organization-dashboard.store';

const flushEffects = async (): Promise<void> => {
  TestBed.tick();
  await Promise.resolve();
  await Promise.resolve();
};

describe('DashboardStore', () => {
  let store: DashboardStore;
  let mockOrganizationService: {
    getDashboard: ReturnType<typeof vi.fn>;
  };

  const organization = { id: 'org-1', name: 'Fireguard' } as unknown as OrganizationOutput;
  const selectedOrganizationId = signal<string | null>(organization.id);
  const recentIntervention = {
    id: 'int-1',
    number: 2048,
    name: 'Contrôle annuel extincteurs',
    status: 'in_progress',
    priority: 'high',
    siteId: 'fac-1',
    siteName: 'Siège — Paris 12e',
    responsibleId: 'member-1',
    responsibleName: 'Claire Lefèvre',
    responsibleAvatarUrl: null,
    dueAt: '2026-07-18T00:00:00+00:00',
    updatedAt: '2026-07-15T09:30:00+00:00',
  };
  const dashboard = {
    overview: {
      facilities: { summary: [{ value: 4 }] },
      members: { summary: [{ value: 12 }] },
      equipment: { summary: [{ value: 18 }] },
      inspections: { summary: [{ value: 7 }] },
    },
    comparison: {
      metrics: [{ key: 'facilities', value: 2, direction: 'up' }],
    },
    trends: {
      facilities: [
        { bucket: '2026-07-13', value: 2 },
        { bucket: '2026-07-14', value: 3 },
        { bucket: '2026-07-15', value: 4 },
      ],
      members: [
        { bucket: '2026-07-13', value: 12 },
        { bucket: '2026-07-14', value: 12 },
      ],
      equipment: [],
    },
    recentInterventions: [recentIntervention],
  } as unknown as OrganizationDashboardOutput;

  beforeEach(() => {
    selectedOrganizationId.set(organization.id);
    mockOrganizationService = {
      getDashboard: vi.fn().mockReturnValue(of(dashboard)),
    };

    TestBed.configureTestingModule({
      providers: [
        DashboardStore,
        { provide: OrganizationService, useValue: mockOrganizationService },
        {
          provide: ActiveOrganizationStore,
          useValue: {
            selectedOrganization: signal<OrganizationOutput | null>(organization),
            selectedOrganizationId,
          },
        },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    store = TestBed.inject(DashboardStore);
  });

  it('should auto-load dashboard data for the active organization', async () => {
    await flushEffects();

    expect(mockOrganizationService.getDashboard).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ from: expect.any(String), to: expect.any(String) }),
    );
    expect(store.queryData()).toEqual(dashboard);
    expect(store.facilityCount()).toBe(4);
    expect(store.membersComparison()).toBeNull();
    expect(store.facilitiesComparison()).toEqual({ value: 2, direction: 'up' });
  });

  it('should map embedded trend series to numeric sparkline points', async () => {
    await flushEffects();

    expect(store.facilitiesSparkline()).toEqual([2, 3, 4]);
    expect(store.membersSparkline()).toEqual([12, 12]);
  });

  it('should expose null sparklines for empty or missing series', async () => {
    await flushEffects();

    expect(store.equipmentSparkline()).toBeNull();
    expect(store.inspectionsSparkline()).toBeNull();
  });

  it('should expose the embedded recent interventions', async () => {
    await flushEffects();

    expect(store.recentInterventions()).toEqual([recentIntervention]);
  });

  it('clears organization A data while B loads and keeps a B failure free of A data', async () => {
    await flushEffects();
    const pending = new Subject<OrganizationDashboardOutput>();
    mockOrganizationService.getDashboard.mockReturnValue(pending);

    selectedOrganizationId.set('org-2');
    await flushEffects();

    expect(store.queryOrganizationId()).toBe('org-2');
    expect(store.isQueryLoading()).toBe(true);
    expect(store.queryData()).toBeNull();
    expect(store.facilityCount()).toBeNull();
    expect(store.facilitiesSparkline()).toBeNull();
    expect(store.recentInterventions()).toEqual([]);

    pending.error(new Error('Organization B unavailable'));

    expect(store.queryHasError()).toBe(true);
    expect(store.queryError()?.message).toBe('Organization B unavailable');
    expect(store.queryData()).toBeNull();
    expect(store.recentInterventions()).toEqual([]);
  });

  it('cancels an A refresh when B becomes active and ignores out-of-order results', async () => {
    await flushEffects();
    const stale = new Subject<OrganizationDashboardOutput>();
    const current = new Subject<OrganizationDashboardOutput>();
    mockOrganizationService.getDashboard.mockReturnValueOnce(stale).mockReturnValueOnce(current);
    store.load('org-1');
    expect(stale.observed).toBe(true);

    selectedOrganizationId.set('org-2');
    await flushEffects();
    expect(stale.observed).toBe(false);

    const organizationBData = { ...dashboard, recentInterventions: [] };
    current.next(organizationBData);
    stale.next(dashboard);

    expect(store.queryOrganizationId()).toBe('org-2');
    expect(store.queryData()).toEqual(organizationBData);
    expect(store.recentInterventions()).toEqual([]);
  });

  it.each(['success', 'error'] as const)(
    'ignores a stale %s before Angular processes the changed organization',
    async (outcome) => {
      const pending = new Subject<OrganizationDashboardOutput>();
      mockOrganizationService.getDashboard.mockReturnValue(pending);
      await flushEffects();

      selectedOrganizationId.set('org-2');
      if (outcome === 'success') pending.next(dashboard);
      else pending.error(new Error('Stale failure'));

      expect(store.queryData()).toBeNull();
      expect(store.queryError()).toBeNull();
    },
  );

  it('cancels a pending refresh and clears data and errors when organization disappears', async () => {
    await flushEffects();
    const pending = new Subject<OrganizationDashboardOutput>();
    mockOrganizationService.getDashboard.mockReturnValue(pending);
    store.load('org-1');

    selectedOrganizationId.set(null);
    await flushEffects();
    pending.next(dashboard);

    expect(pending.observed).toBe(false);
    expect(store.queryOrganizationId()).toBeNull();
    expect(store.queryData()).toBeNull();
    expect(store.queryError()).toBeNull();
    expect(store.isQueryLoading()).toBe(false);
    expect(store.isQueryLoaded()).toBe(false);
  });

  it('retains same-organization data during a refresh and recoverable failure', async () => {
    await flushEffects();
    const pending = new Subject<OrganizationDashboardOutput>();
    mockOrganizationService.getDashboard.mockReturnValue(pending);
    store.load('org-1');

    expect(store.isQueryLoading()).toBe(true);
    expect(store.queryData()).toEqual(dashboard);
    pending.error(new Error('Refresh unavailable'));
    expect(store.queryHasError()).toBe(true);
    expect(store.queryData()).toEqual(dashboard);
  });

  it('recovers from an initial load failure when the active organization retries', async () => {
    const pending = new Subject<OrganizationDashboardOutput>();
    mockOrganizationService.getDashboard.mockReturnValue(pending);
    await flushEffects();

    expect(store.isQueryLoading()).toBe(true);
    expect(store.queryData()).toBeNull();
    expect(store.facilityCount()).toBeNull();

    pending.error(new Error('Dashboard unavailable'));
    expect(store.queryHasError()).toBe(true);
    expect(store.queryError()?.message).toBe('Dashboard unavailable');

    mockOrganizationService.getDashboard.mockReturnValue(of(dashboard));
    store.load('org-1');

    expect(store.isQueryLoaded()).toBe(true);
    expect(store.queryError()).toBeNull();
    expect(store.facilityCount()).toBe(4);
  });

  it('keeps the previous snapshot during refresh and replaces all KPI details on success', async () => {
    await flushEffects();
    const pending = new Subject<OrganizationDashboardOutput>();
    mockOrganizationService.getDashboard.mockReturnValue(pending);
    store.load('org-1');

    expect(store.isQueryLoading()).toBe(true);
    expect(store.memberCount()).toBe(12);
    expect(store.facilitiesComparison()).toEqual({ value: 2, direction: 'up' });

    const refreshed = {
      ...dashboard,
      overview: {
        facilities: { summary: [{ value: '6' }] },
        members: { summary: [{ value: 14 }] },
        equipment: { summary: [{ value: 20 }] },
        inspections: { summary: [{ value: 9 }] },
      },
      comparison: {
        metrics: [
          { key: 'facilities', value: 2, direction: null },
          { key: 'members', value: 3, direction: 'up' },
          { key: 'equipment', value: -2, direction: 'down' },
          { key: 'inspections', value: 0, direction: 'stable' },
        ],
      },
      recentInterventions: [],
      alerts: [],
    } as unknown as OrganizationDashboardOutput;
    pending.next(refreshed);

    expect(store.isQueryLoaded()).toBe(true);
    expect(store.queryData()).toEqual(refreshed);
    expect(store.facilityCount()).toBe('6');
    expect(store.memberCount()).toBe(14);
    expect(store.equipmentCount()).toBe(20);
    expect(store.inspectionCount()).toBe(9);
    expect(store.facilitiesComparison()).toEqual({ value: 2, direction: null });
    expect(store.membersComparison()).toEqual({ value: 3, direction: 'up' });
    expect(store.equipmentComparison()).toEqual({ value: -2, direction: 'down' });
    expect(store.inspectionsComparison()).toEqual({ value: 0, direction: 'stable' });
    expect(store.recentInterventions()).toEqual([]);
    expect(store.alerts()).toEqual([]);
  });

  it('does not preserve obsolete KPI values when a partial snapshot arrives', async () => {
    await flushEffects();
    const partial = {
      ...dashboard,
      overview: {
        facilities: { summary: [] },
        members: { summary: [{ value: null }] },
      },
      comparison: { metrics: [{ key: 'members', value: 0, direction: null }] },
      trends: {
        facilities: [{ bucket: '2026-07-13', value: 'unavailable' }],
        members: [
          { bucket: '2026-07-13', value: '' },
          { bucket: '2026-07-14', value: '13' },
        ],
      },
      recentInterventions: undefined,
      alerts: undefined,
    } as unknown as OrganizationDashboardOutput;
    mockOrganizationService.getDashboard.mockReturnValue(of(partial));
    store.load('org-1');

    expect(store.facilityCount()).toBeNull();
    expect(store.memberCount()).toBeNull();
    expect(store.equipmentCount()).toBeNull();
    expect(store.inspectionCount()).toBeNull();
    expect(store.facilitiesComparison()).toBeNull();
    expect(store.membersComparison()).toEqual({ value: 0, direction: null });
    expect(store.equipmentComparison()).toBeNull();
    expect(store.inspectionsComparison()).toBeNull();
    expect(store.facilitiesSparkline()).toBeNull();
    expect(store.membersSparkline()).toEqual([13]);
    expect(store.recentInterventions()).toEqual([]);
    expect(store.alerts()).toEqual([]);
  });

  it('keeps the latest same-organization refresh when the previous request settles late', async () => {
    await flushEffects();
    const stale = new Subject<OrganizationDashboardOutput>();
    const latest = new Subject<OrganizationDashboardOutput>();
    mockOrganizationService.getDashboard.mockReturnValueOnce(stale).mockReturnValueOnce(latest);

    store.load('org-1');
    store.load('org-1');

    expect(stale.observed).toBe(false);
    expect(latest.observed).toBe(true);

    const refreshed = { ...dashboard, recentInterventions: [] };
    latest.next(refreshed);
    stale.error(new Error('Obsolete refresh failed'));

    expect(store.isQueryLoaded()).toBe(true);
    expect(store.queryError()).toBeNull();
    expect(store.queryData()).toEqual(refreshed);
    expect(store.recentInterventions()).toEqual([]);
  });

  it('does not issue a manual refresh with an obsolete organization identifier', async () => {
    await flushEffects();
    const pending = new Subject<OrganizationDashboardOutput>();
    mockOrganizationService.getDashboard.mockReturnValue(pending);
    selectedOrganizationId.set('org-2');
    await flushEffects();
    const calls = mockOrganizationService.getDashboard.mock.calls.length;

    store.load('org-1');

    expect(mockOrganizationService.getDashboard).toHaveBeenCalledTimes(calls);
    expect(store.queryOrganizationId()).toBe('org-2');
    expect(pending.observed).toBe(true);
    pending.next({ ...dashboard, recentInterventions: [] });
    expect(store.isQueryLoaded()).toBe(true);
    expect(store.recentInterventions()).toEqual([]);
  });
});
