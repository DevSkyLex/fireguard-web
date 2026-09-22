import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
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
    alignedTrendData: signal({
      buckets: [] as string[],
      labels: [] as string[],
      datasets: [[], [], []] as (number | null)[][],
    }),
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
    setDateRange: vi.fn(),
    setGranularity: vi.fn(),
    setCompareEnabled: vi.fn(),
    isQueryLoading: signal(false),
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
    canReadInterventions.set(true);
    queryHasError.set(false);
    additionalPermissions.set([]);
    dashboard.queryData.set({ recentInterventions: [RECENT] });
    dashboard.queryError.set(null);
    dashboard.isQueryLoading.set(false);
    overview.queryData.set(null);
    overview.isQueryLoading.set(false);
    overview.alignedTrendData.set({ buckets: [], labels: [], datasets: [[], [], []] });
    overview.queryHasError.set(false);
    overview.queryError.set(null);
    assets.queryData.set(null);
    assets.queryHasError.set(false);
    assets.queryError.set(null);
    assets.isQueryLoading.set(false);
    assets.canReadEquipment.set(false);
    assets.canReadFacilities.set(false);
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
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

  /**
   * Function render
   * @description Renders the page with independent aggregate and trend store doubles.
   * @access private
   * @returns {Promise<void>} Resolves after page effects and child bindings settle.
   */
  async function render(): Promise<void> {
    fixture = TestBed.createComponent(OrganizationDashboardPage);
    await fixture.whenStable();
  }

  it('keeps intervention permissions authoritative for recent work', async () => {
    canReadInterventions.set(false);
    await render();
    expect(find('org-dashboard-recent')).toBeNull();
  });

  it('does not offer stale recent work when the aggregate query fails', async () => {
    queryHasError.set(true);
    await render();
    expect(find('org-dashboard-recent')).toBeNull();
  });

  it('renders current snapshot values and routes each indicator through its read permission', async () => {
    additionalPermissions.set([
      ORGANIZATION_PERMISSION.INSPECTION_READ,
      ORGANIZATION_PERMISSION.EQUIPMENT_READ,
    ]);
    dashboard.queryData.set({
      recentInterventions: [RECENT],
      overview: {
        interventions: { summary: [{ key: 'open', value: 3 }] },
        nonConformities: {
          summary: [
            { key: 'open', value: 2 },
            { key: 'inProgress', value: 4 },
            { key: 'overdue', value: 1 },
          ],
        },
        inspections: { summary: [{ key: 'closed', value: 8 }] },
        equipment: { summary: [{ key: 'underMaintenance', value: 0 }] },
      },
    });
    await render();
    expect(fixture.componentInstance['kpiTiles']().map((tile) => tile.value)).toEqual([3, 6, 8, 0]);
    expect(find('org-dashboard-kpi-open-non-conformities')?.textContent).toContain('1 overdue');
    expect(
      find('org-dashboard-kpi-equipment-under-maintenance')
        ?.querySelector('a')
        ?.getAttribute('href'),
    ).toBe('/organizations/org-1/equipments');
    additionalPermissions.set([]);
    await fixture.whenStable();
    expect(find('org-dashboard-kpi-equipment-under-maintenance')?.querySelector('a')).toBeNull();
    expect(find('org-dashboard-recent')?.textContent).toContain(RECENT.name);
  });

  it('feeds chart children the matching trend series while preserving loaded data during refresh', async () => {
    overview.queryData.set({ inspections: trend, ncOpened: trend, ncResolved: trend });
    overview.alignedTrendData.set({
      buckets: ['2026-09-01'],
      labels: ['1 Sep'],
      datasets: [[7], [3], [2]],
    });
    overview.isQueryLoading.set(true);
    await render();
    const charts = fixture.debugElement.queryAll(By.directive(LineChart));
    expect(charts.map((chart) => (chart.componentInstance as LineChart).series())).toEqual([
      [
        {
          name: 'Inspections performed',
          points: [{ label: '1 Sep', value: 7 }],
          colorToken: 'primary',
        },
      ],
      [
        { name: 'Opened', points: [{ label: '1 Sep', value: 3 }], colorToken: 'warning' },
        { name: 'Resolved', points: [{ label: '1 Sep', value: 2 }], colorToken: 'success' },
      ],
    ]);
    expect(charts.every((chart) => !(chart.componentInstance as LineChart).loading())).toBe(true);
    fixture.componentInstance['compareToPreviousPeriod'].set(false);
    await fixture.whenStable();
    expect(overview.setCompareEnabled).toHaveBeenLastCalledWith(false);
    expect(assets.setCompareEnabled).toHaveBeenLastCalledWith(false);
    expect(dashboard.load).not.toHaveBeenCalled();
  });

  it.each([
    { preset: '7d', granularity: 'day', days: 7 },
    { preset: '90d', granularity: 'week', days: 90 },
    { preset: '12m', granularity: 'month', days: null },
    { preset: 'unsupported', granularity: 'day', days: 30 },
  ])(
    'applies the $preset activity range without reloading the aggregate snapshot',
    async ({ preset, granularity, days }) => {
      await render();
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
    await render();
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
    await render();
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
    await render();
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
    await render();
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
    await render();
    expect(root().textContent).toContain('permissions');
    const retries = Array.from(root().querySelectorAll('button')).filter(
      (button) => button.textContent?.trim() === 'Retry',
    );
    expect(retries).toHaveLength(0);
  });
});
