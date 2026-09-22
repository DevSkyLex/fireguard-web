import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { toStoreError, type StoreError } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  ORGANIZATION_PERMISSION,
  type OrganizationDashboardRecentIntervention,
  type OrganizationDashboardOutput,
  type OrganizationDashboardOverviewTrendResource,
  type OrganizationDashboardTrendOutput,
} from '@features/organization/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import {
  AssetGrowthTrendStore,
  DashboardStore,
  OverviewTrendStore,
} from '@features/organization/state/organization-dashboard';
import { LineChart } from '@shared/chart';
import { OrganizationDashboardPage } from '../organization-dashboard-page.component';

const RECENT: OrganizationDashboardRecentIntervention = {
  id: 'intervention-1',
  number: 42,
  name: 'Inspect the north wing',
  status: 'in_progress',
  priority: 'normal',
  siteId: 'site-1',
  siteName: 'North wing',
  responsibleId: null,
  responsibleName: null,
  responsibleAvatarUrl: null,
  dueAt: '2026-09-12T12:00:00Z',
  updatedAt: '2026-09-12T10:00:00Z',
};

describe('OrganizationDashboardPage', () => {
  let fixture: ComponentFixture<OrganizationDashboardPage>;
  const mobileInteractionMode = signal(false);
  const canReadInterventions = signal(true);
  const queryHasError = signal(false);
  const additionalPermissions = signal<readonly string[]>([]);
  const dashboard = {
    queryData: signal<Partial<OrganizationDashboardOutput> | null>({
      recentInterventions: [RECENT],
    }),
    queryHasError,
    queryError: signal<StoreError | null>(null),
    isQueryLoading: signal(false),
    load: vi.fn(),
  };
  const overview = {
    queryData: signal<OrganizationDashboardOverviewTrendResource | null>(null),
    queryHasError: signal(false),
    queryError: signal<StoreError | null>(null),
    isQueryLoading: signal(false),
    alignedTrendData: signal({ buckets: [], labels: [], datasets: [[], [], []] }),
    activate: vi.fn(),
    setDateRange: vi.fn(),
    setGranularity: vi.fn(),
    setCompareEnabled: vi.fn(),
    load: vi.fn(),
    loadParams: vi
      .fn()
      .mockReturnValue({ organizationId: 'org-1', granularity: 'day', compare: true }),
  };
  const assets = {
    ...overview,
    queryData: signal<{
      equipment: OrganizationDashboardTrendOutput;
      facilities: OrganizationDashboardTrendOutput;
    } | null>(null),
    queryHasError: signal(false),
    queryError: signal<StoreError | null>(null),
    alignedTrendData: signal({ buckets: [], labels: [], datasets: [[], []] }),
    activate: vi.fn(),
    canReadEquipment: signal(false),
    canReadFacilities: signal(false),
    load: vi.fn(),
    loadParams: vi
      .fn()
      .mockReturnValue({ organizationId: 'org-1', granularity: 'week', compare: true }),
  };
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const find = (id: string): HTMLElement | null =>
    root().querySelector('[data-testid="' + id + '"]');

  beforeEach(() => {
    mobileInteractionMode.set(false);
    canReadInterventions.set(true);
    queryHasError.set(false);
    additionalPermissions.set([]);
    dashboard.queryData.set({ recentInterventions: [RECENT] });
    dashboard.queryError.set(null);
    overview.queryData.set(null);
    overview.queryHasError.set(false);
    overview.queryError.set(null);
    assets.queryData.set(null);
    assets.queryHasError.set(false);
    assets.queryError.set(null);
    assets.canReadEquipment.set(false);
    assets.canReadFacilities.set(false);
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: {
            isMobileInteractionMode: mobileInteractionMode,
            interactionMode: () => (mobileInteractionMode() ? 'mobile' : 'desktop'),
          },
        },
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: { selectedOrganizationId: signal('org-1') },
        },
        {
          provide: OrganizationPermissionService,
          useValue: {
            hasPermission: (permission: string): boolean =>
              (permission === ORGANIZATION_PERMISSION.INTERVENTIONS_READ &&
                canReadInterventions()) ||
              additionalPermissions().includes(permission),
          },
        },
      ],
    });
    TestBed.overrideComponent(LineChart, { set: { template: '' } });
    TestBed.overrideComponent(OrganizationDashboardPage, {
      remove: { providers: [DashboardStore, OverviewTrendStore, AssetGrowthTrendStore] },
      add: {
        providers: [
          {
            provide: DashboardStore,
            useValue: dashboard,
          },
          { provide: OverviewTrendStore, useValue: overview },
          { provide: AssetGrowthTrendStore, useValue: assets },
        ],
      },
    });
  });

  async function render(mobile: boolean): Promise<void> {
    mobileInteractionMode.set(mobile);
    fixture = TestBed.createComponent(OrganizationDashboardPage);
    await fixture.whenStable();
  }

  it.each([true, false])(
    'keeps the documented KPI, analysis and recent-work order when mobile is %s',
    async (mobile: boolean) => {
      await render(mobile);
      const kpis = find('org-dashboard-kpis');
      const trends = find('org-dashboard-trends');
      const recent = find('org-dashboard-recent');
      const cards = Array.from(kpis?.querySelectorAll('[hlmCard]') ?? []);
      expect(cards.length).toBeGreaterThan(0);
      expect(
        cards.every((card) => card.getAttribute('data-size') === (mobile ? 'sm' : 'default')),
      ).toBe(true);
      expect(
        kpis && trends && kpis.compareDocumentPosition(trends) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        trends &&
          recent &&
          trends.compareDocumentPosition(recent) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(find('org-dashboard-alerts')).not.toBeNull();
      expect(root().querySelectorAll('[data-testid="org-dashboard-recent"]')).toHaveLength(1);
    },
  );

  it('retains the native desktop table composition', async () => {
    await render(false);
    expect(find('org-dashboard-mobile-work')).toBeNull();
    expect(find('org-dashboard-mobile-analysis')).toBeNull();
    const recent = find('org-dashboard-recent');
    expect(
      recent
        ?.querySelector('table')
        ?.closest('[hlmTableContainer]')
        ?.classList.contains('desktop-ui:@[700px]/recent:block'),
    ).toBe(true);
  });

  it('keeps intervention permissions authoritative for recent work', async () => {
    canReadInterventions.set(false);
    await render(true);
    expect(find('org-dashboard-recent')).toBeNull();
  });

  it('does not offer stale recent work when the aggregate query fails', async () => {
    queryHasError.set(true);
    await render(true);
    expect(find('org-dashboard-recent')).toBeNull();
  });

  it.each([
    { preset: '7d', granularity: 'day', days: 7 },
    { preset: '90d', granularity: 'week', days: 90 },
    { preset: '12m', granularity: 'month', days: null },
    { preset: 'unsupported', granularity: 'day', days: 30 },
  ])(
    'applies the $preset activity range without reloading the aggregate snapshot',
    async ({ preset, granularity, days }) => {
      await render(false);
      fixture.componentInstance['onPeriodChanged'](preset);
      await fixture.whenStable();
      expect(overview.setGranularity).toHaveBeenLastCalledWith(granularity);
      const range = overview.setDateRange.mock.lastCall?.[0] as Date[] | undefined;
      expect(range).toHaveLength(2);
      if (range) {
        if (days !== null)
          expect(Math.round((range[1].getTime() - range[0].getTime()) / 86_400_000)).toBe(days);
        else expect(range[1].getFullYear() - range[0].getFullYear()).toBe(1);
      }
      expect(assets.setGranularity).toHaveBeenLastCalledWith(granularity);
      expect(dashboard.load).not.toHaveBeenCalled();
    },
  );

  it('sorts alerts by urgency while keeping unrelated and unauthorized links unavailable', async () => {
    dashboard.queryData.set({
      alerts: [
        { code: 'expired_invitations', count: 3 },
        { code: 'unexpected_alert', count: -1 },
        { code: 'equipment_under_maintenance', count: 2 },
        { code: 'non_conformities_overdue', count: 1 },
        { code: 'critical_non_conformities_open', count: 4 },
      ],
    });
    additionalPermissions.set([
      ORGANIZATION_PERMISSION.EQUIPMENT_READ,
      ORGANIZATION_PERMISSION.INSPECTION_READ,
    ]);
    await render(false);
    const rows = fixture.componentInstance['alertRows']();
    expect(rows?.map((row) => row.count)).toEqual([4, 1, 2, 3, null]);
    expect(rows?.map((row) => row.destination)).toEqual([
      ['/organizations', 'org-1', 'inspections'],
      ['/organizations', 'org-1', 'inspections'],
      ['/organizations', 'org-1', 'equipments'],
      null,
      null,
    ]);
    additionalPermissions.set([ORGANIZATION_PERMISSION.MEMBERS_MANAGE]);
    expect(fixture.componentInstance['alertRows']()?.[3].destination).toEqual([
      '/organizations',
      'org-1',
      'members',
    ]);
  });

  it('renders all-status severity shares without confusing missing data and zero values', async () => {
    dashboard.queryData.set({
      overview: {
        nonConformities: {
          summary: [
            { key: 'severityCritical', value: 1 },
            { key: 'severityHigh', value: 2 },
            { key: 'severityMedium', value: 1 },
            { key: 'severityLow', value: 0 },
          ],
        },
      },
    });
    await render(false);
    find('org-dashboard-additional')?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance['severityBreakdown']().map((entry) => entry.percent)).toEqual([
      25, 50, 25, 0,
    ]);
    expect(root().textContent).toContain('4 recorded, across all statuses');
    expect(find('org-statistics-severity-critical')?.textContent).toContain('1');
  });

  const trend: OrganizationDashboardTrendOutput = {
    '@id': '/trend',
    '@type': 'Trend',
    generatedAt: '2026-09-22T10:00:00Z',
    metric: 'inspections',
    period: { from: '2026-09-01T00:00:00Z', to: '2026-09-20T00:00:00Z', granularity: 'day' },
    summary: { total: 10 },
    series: [],
    comparison: { mode: 'previous_period', summary: { total: 8, delta: 25 } },
  };

  it('keeps response-period totals and meaningful comparisons together across the charts', async () => {
    overview.queryData.set({
      inspections: trend,
      ncOpened: { ...trend, summary: { total: 5 } },
      ncResolved: { ...trend, summary: { total: 3 } },
    });
    assets.queryData.set({
      equipment: trend,
      facilities: {
        ...trend,
        summary: { total: 3 },
        comparison: { mode: 'previous_period', summary: { total: 0, delta: 100 } },
      },
    });
    assets.canReadEquipment.set(true);
    assets.canReadFacilities.set(true);
    await render(false);
    find('org-dashboard-additional')?.click();
    await fixture.whenStable();
    expect(root().textContent).toContain('5 opened, 3 resolved this period');
    expect(root().textContent).toContain('10 total this period, +25% vs previous period');
    expect(root().textContent).toContain('3 total this period');
    expect(fixture.componentInstance['inspectionsDeltaLine']()).toBe('+25% vs previous period');
    expect(fixture.componentInstance['formatLoadedPeriod'](trend.period)).not.toBe('');
    expect(
      fixture.componentInstance['formatLoadedPeriod']({ from: 'not-a-date', to: '2026-09-20' }),
    ).toBe('');
    expect(
      fixture.componentInstance['formatLoadedPeriod']({ from: '2026-10-01', to: '2026-09-20' }),
    ).toBe('');

    overview.queryData.set({
      inspections: {
        ...trend,
        comparison: { mode: 'previous_period', summary: { total: 0, delta: 100 } },
      },
      ncOpened: trend,
      ncResolved: trend,
    });
    expect(fixture.componentInstance['inspectionsDeltaLine']()).toBe('No previous-period baseline');
  });

  it('retries the three query boundaries with their current organization and loaded filters', async () => {
    await render(false);
    fixture.componentInstance['retryDashboard']();
    fixture.componentInstance['retryOverviewTrend']();
    fixture.componentInstance['retryAssetGrowthTrend']();
    expect(dashboard.load).toHaveBeenCalledExactlyOnceWith('org-1');
    expect(overview.load).toHaveBeenCalledExactlyOnceWith(overview.loadParams());
    expect(assets.load).toHaveBeenCalledExactlyOnceWith(assets.loadParams());
  });

  it('renders a permission denial without offering a chart retry', async () => {
    overview.queryHasError.set(true);
    overview.queryError.set(toStoreError({ '@type': 'Error', status: 403, detail: 'Forbidden' }));
    await render(false);
    expect(root().textContent).toContain('permissions');
    const retries = Array.from(root().querySelectorAll('button')).filter(
      (button) => button.textContent?.trim() === 'Retry',
    );
    expect(retries).toHaveLength(0);
  });
});
