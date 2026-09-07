import { computed, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { OrganizationService } from '@features/organization/data-access';
import type {
  OrganizationDashboardTrendOutput,
  OrganizationOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { OverviewTrendStore } from '../organization-dashboard-overview-trend.store';

const flushEffects = async (): Promise<void> => {
  TestBed.tick();
  await Promise.resolve();
  await Promise.resolve();
};

describe('OverviewTrendStore', () => {
  let store: OverviewTrendStore;
  let mockOrganizationService: {
    getDashboardInspectionsTrend: ReturnType<typeof vi.fn>;
    getDashboardNonConformitiesOpenedTrend: ReturnType<typeof vi.fn>;
    getDashboardNonConformitiesResolvedTrend: ReturnType<typeof vi.fn>;
  };

  const organization = { id: 'org-1', name: 'Fireguard' } as unknown as OrganizationOutput;
  const selectedOrganization = signal<OrganizationOutput | null>(organization);
  const selectedOrganizationId = computed(() => selectedOrganization()?.id ?? null);
  const inspectionsTrend = {
    '@id': '/api/organizations/org-1/dashboard/trends/inspections',
    '@type': 'OrganizationDashboardTrend',
    metric: 'inspections',
    generatedAt: '2026-04-08T10:00:00Z',
    period: { granularity: 'week', from: '2026-03-01T00:00:00Z', to: '2026-04-01T00:00:00Z' },
    summary: { total: 10 },
    series: [{ bucket: '2026-03-10', value: 10 }],
    comparison: { series: [{ bucket: '2026-02-10', value: 8 }] },
  } as OrganizationDashboardTrendOutput;
  const ncOpenedTrend = {
    ...inspectionsTrend,
    '@id': '/api/organizations/org-1/dashboard/trends/nc-opened',
    metric: 'nonConformitiesOpened',
  } as OrganizationDashboardTrendOutput;
  const ncResolvedTrend = {
    ...inspectionsTrend,
    '@id': '/api/organizations/org-1/dashboard/trends/nc-resolved',
    metric: 'nonConformitiesResolved',
  } as OrganizationDashboardTrendOutput;

  beforeEach(() => {
    selectedOrganization.set(organization);
    mockOrganizationService = {
      getDashboardInspectionsTrend: vi.fn().mockReturnValue(of(inspectionsTrend)),
      getDashboardNonConformitiesOpenedTrend: vi.fn().mockReturnValue(of(ncOpenedTrend)),
      getDashboardNonConformitiesResolvedTrend: vi.fn().mockReturnValue(of(ncResolvedTrend)),
    };

    TestBed.configureTestingModule({
      providers: [
        OverviewTrendStore,
        { provide: OrganizationService, useValue: mockOrganizationService },
        {
          provide: ActiveOrganizationStore,
          useValue: { selectedOrganization, selectedOrganizationId },
        },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    store = TestBed.inject(OverviewTrendStore);
  });

  it('defers queries until analysis is activated and does not reload on reactivation', async () => {
    await flushEffects();
    expect(mockOrganizationService.getDashboardInspectionsTrend).not.toHaveBeenCalled();
    store.activate();
    await flushEffects();
    store.activate();
    await flushEffects();
    expect(mockOrganizationService.getDashboardInspectionsTrend).toHaveBeenCalledTimes(1);
  });

  it('loads the three overview trend resources after activation', async () => {
    store.activate();
    await flushEffects();

    expect(mockOrganizationService.getDashboardInspectionsTrend).toHaveBeenCalledTimes(1);
    expect(mockOrganizationService.getDashboardNonConformitiesOpenedTrend).toHaveBeenCalledTimes(1);
    expect(mockOrganizationService.getDashboardNonConformitiesResolvedTrend).toHaveBeenCalledTimes(
      1,
    );
    expect(store.queryData()).toEqual({
      inspections: inspectionsTrend,
      ncOpened: ncOpenedTrend,
      ncResolved: ncResolvedTrend,
    });
  });
  it('keeps loaded bucket labels while a different granularity is pending', async () => {
    store.activate();
    await flushEffects();
    const before = store.alignedTrendData();
    const pending = new Subject<OrganizationDashboardTrendOutput>();
    mockOrganizationService.getDashboardInspectionsTrend.mockReturnValue(pending);
    store.setGranularity('month');
    await flushEffects();
    expect(store.isQueryLoading()).toBe(true);
    expect(store.alignedTrendData()).toEqual(before);
    pending.next({
      ...inspectionsTrend,
      period: { ...inspectionsTrend.period, granularity: 'month' },
    });
    pending.complete();
    await flushEffects();
    expect(store.isQueryLoading()).toBe(false);
    expect(store.alignedTrendData()).not.toEqual(before);
  });
  it('does not fetch secondary chart data in a server render', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        OverviewTrendStore,
        { provide: OrganizationService, useValue: mockOrganizationService },
        {
          provide: ActiveOrganizationStore,
          useValue: { selectedOrganization, selectedOrganizationId },
        },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });
    const serverStore = TestBed.inject(OverviewTrendStore);
    serverStore.activate();
    await flushEffects();
    expect(mockOrganizationService.getDashboardInspectionsTrend).not.toHaveBeenCalled();
    expect(serverStore.queryData()).toBeNull();
  });

  it('clears all A datasets while B loads and exposes only the B error', async () => {
    store.activate();
    await flushEffects();
    const pending = new Subject<OrganizationDashboardTrendOutput>();
    mockOrganizationService.getDashboardInspectionsTrend.mockReturnValue(pending);

    selectedOrganization.set({ ...organization, id: 'org-2' });
    await flushEffects();

    expect(store.queryOrganizationId()).toBe('org-2');
    expect(store.queryData()).toBeNull();
    expect(store.isQueryLoading()).toBe(true);
    pending.error(new Error('Organization B unavailable'));
    expect(store.queryError()?.message).toBe('Organization B unavailable');
    expect(store.queryData()).toBeNull();
  });

  it('cancels an A retry when B loads and ignores results received out of order', async () => {
    store.activate();
    await flushEffects();
    const stale = new Subject<OrganizationDashboardTrendOutput>();
    const current = new Subject<OrganizationDashboardTrendOutput>();
    mockOrganizationService.getDashboardInspectionsTrend
      .mockReturnValueOnce(stale)
      .mockReturnValueOnce(current);
    store.load(store.loadParams());

    selectedOrganization.set({ ...organization, id: 'org-2' });
    await flushEffects();
    expect(stale.observed).toBe(false);

    const trendB = { ...inspectionsTrend, summary: { total: 42 } };
    current.next(trendB);
    current.complete();
    stale.next(inspectionsTrend);
    stale.complete();

    expect(store.queryData()?.inspections).toEqual(trendB);
    expect(store.queryOrganizationId()).toBe('org-2');
  });

  it.each(['success', 'error'] as const)(
    'ignores an A %s before the organization-change effects run',
    async (outcome) => {
      const pending = new Subject<OrganizationDashboardTrendOutput>();
      mockOrganizationService.getDashboardInspectionsTrend.mockReturnValue(pending);
      store.activate();
      await flushEffects();

      selectedOrganization.set({ ...organization, id: 'org-2' });
      if (outcome === 'success') {
        pending.next(inspectionsTrend);
        pending.complete();
      } else pending.error(new Error('Stale failure'));

      expect(store.queryData()).toBeNull();
      expect(store.queryError()).toBeNull();
    },
  );

  it('cancels and clears a pending query when no organization is selected', async () => {
    store.activate();
    await flushEffects();
    const pending = new Subject<OrganizationDashboardTrendOutput>();
    mockOrganizationService.getDashboardInspectionsTrend.mockReturnValue(pending);
    store.load(store.loadParams());
    selectedOrganization.set(null);
    await flushEffects();
    pending.next(inspectionsTrend);
    pending.complete();

    expect(pending.observed).toBe(false);
    expect(store.queryOrganizationId()).toBeNull();
    expect(store.queryData()).toBeNull();
    expect(store.queryError()).toBeNull();
    expect(store.isQueryLoading()).toBe(false);
  });

  it('retains data during an incomplete period draft but clears it if the organization then changes', async () => {
    store.activate();
    await flushEffects();
    const previous = store.queryData();
    store.setDateRange([new Date('2026-04-01')]);
    await flushEffects();
    expect(store.loadParams()).toBeUndefined();
    expect(store.queryData()).toEqual(previous);

    selectedOrganization.set({ ...organization, id: 'org-2' });
    await flushEffects();
    expect(store.queryData()).toBeNull();
    expect(store.queryOrganizationId()).toBe('org-2');
  });

  it('retains data when a same-organization period refresh fails', async () => {
    store.activate();
    await flushEffects();
    const previous = store.queryData();
    const pending = new Subject<OrganizationDashboardTrendOutput>();
    mockOrganizationService.getDashboardInspectionsTrend.mockReturnValue(pending);
    store.setCompareEnabled(false);
    await flushEffects();

    expect(store.queryData()).toEqual(previous);
    pending.error(new Error('Period unavailable'));
    expect(store.queryHasError()).toBe(true);
    expect(store.queryData()).toEqual(previous);
  });

  it('ignores an obsolete manual retry without cancelling the current organization query', async () => {
    store.activate();
    await flushEffects();
    const oldParams = store.loadParams();
    const pending = new Subject<OrganizationDashboardTrendOutput>();
    mockOrganizationService.getDashboardInspectionsTrend.mockReturnValue(pending);
    selectedOrganization.set({ ...organization, id: 'org-2' });
    await flushEffects();

    store.load(oldParams);

    expect(pending.observed).toBe(true);
    expect(mockOrganizationService.getDashboardInspectionsTrend).toHaveBeenCalledTimes(2);
    pending.next({ ...inspectionsTrend, summary: { total: 42 } });
    pending.complete();
    expect(store.queryData()?.inspections.summary?.['total']).toBe(42);
  });

  it('ends a cancelled period refresh without discarding its same-organization data', async () => {
    store.activate();
    await flushEffects();
    const previous = store.queryData();
    const pending = new Subject<OrganizationDashboardTrendOutput>();
    mockOrganizationService.getDashboardInspectionsTrend.mockReturnValue(pending);
    store.load(store.loadParams());

    store.setDateRange([new Date('2026-04-01')]);
    await flushEffects();

    expect(pending.observed).toBe(false);
    expect(store.isQueryLoading()).toBe(false);
    expect(store.queryData()).toEqual(previous);
  });
});
