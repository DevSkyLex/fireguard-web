import {
  ChangeDetectionStrategy,
  Component,
  input,
  provideZonelessChangeDetection,
  signal,
  type InputSignal,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import type { StoreError } from '@core/request-state';
import { THEME_PORT, type ThemePort } from '@core/theme';
import type { AlignedDashboardTrendSeries } from '@features/organization/data-access/adapters/organization-dashboard-trend.adapter';
import type {
  OrganizationDashboardOutput,
  OrganizationDashboardTrendOutput,
  OrganizationOutput,
} from '@features/organization/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import {
  AssetGrowthTrendStore,
  DashboardStore,
  OverviewTrendStore,
} from '@features/organization/state/organization-dashboard';
import { LineChart, type ChartSeries } from '@shared/chart';
import { OrganizationStatisticsPage } from '../organization-statistics-page.component';

/**
 * Stands in for the real line chart, whose own rendering (skeleton, empty
 * state, ngx-charts wiring) is its own spec's business — this page's spec
 * only owns proving what it hands the chart.
 */
@Component({
  selector: 'app-line-chart',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class LineChartStub {
  public readonly series: InputSignal<readonly ChartSeries[]> = input<readonly ChartSeries[]>([]);
  public readonly label: InputSignal<string> = input<string>('');
  public readonly loading: InputSignal<boolean> = input<boolean>(false);
}

function emptyAlignedTrend(): AlignedDashboardTrendSeries {
  return { buckets: [], labels: [], datasets: [] };
}

function storeError(code: number | null): StoreError {
  return { error: null, message: null, code, retryable: false, timestamp: Date.now() };
}

function renderedCharts(fixture: ComponentFixture<OrganizationStatisticsPage>): LineChartStub[] {
  return fixture.debugElement
    .queryAll(By.directive(LineChartStub))
    .map((debugElement) => debugElement.componentInstance as LineChartStub);
}

function dashboardData(): OrganizationDashboardOutput {
  return {
    overview: {
      inspections: { summary: [{ key: 'closed', value: 42 }] },
      nonConformities: {
        summary: [
          { key: 'open', value: 7 },
          { key: 'overdue', value: 2 },
          { key: 'severityCritical', value: 1 },
          { key: 'severityHigh', value: 2 },
          { key: 'severityMedium', value: 3 },
          { key: 'severityLow', value: 1 },
        ],
      },
    },
    health: { metrics: [{ key: 'nonConformityResolutionRate', value: 88 }] },
    comparison: {
      health: { metrics: [{ key: 'nonConformityResolutionRate', delta: 5, direction: 'up' }] },
    },
  } as unknown as OrganizationDashboardOutput;
}

describe('OrganizationStatisticsPage', () => {
  let fixture: ComponentFixture<OrganizationStatisticsPage>;

  let dashboardQueryData: WritableSignal<OrganizationDashboardOutput | null>;
  let dashboardQueryHasError: WritableSignal<boolean>;
  let dashboardQueryError: WritableSignal<StoreError | null>;
  let dashboardIsQueryLoading: WritableSignal<boolean>;
  let facilityCount: WritableSignal<number | string | null>;
  let equipmentCount: WritableSignal<number | string | null>;
  let facilitiesComparison: WritableSignal<{
    readonly value: string | number | null;
    readonly direction: string | null;
  } | null>;
  let equipmentComparison: WritableSignal<{
    readonly value: string | number | null;
    readonly direction: string | null;
  } | null>;
  let inspectionsComparison: WritableSignal<{
    readonly value: string | number | null;
    readonly direction: string | null;
  } | null>;
  let dashboardLoad: ReturnType<typeof vi.fn>;

  let overviewQueryData: WritableSignal<{
    readonly inspections?: OrganizationDashboardTrendOutput;
    readonly ncOpened?: OrganizationDashboardTrendOutput;
    readonly ncResolved?: OrganizationDashboardTrendOutput;
  } | null>;
  let overviewQueryHasError: WritableSignal<boolean>;
  let overviewQueryError: WritableSignal<StoreError | null>;
  let overviewIsQueryLoading: WritableSignal<boolean>;
  let overviewAlignedTrendData: WritableSignal<AlignedDashboardTrendSeries>;
  let overviewSetGranularity: ReturnType<typeof vi.fn>;
  let overviewSetDateRange: ReturnType<typeof vi.fn>;
  let overviewSetCompareEnabled: ReturnType<typeof vi.fn>;
  let overviewLoad: ReturnType<typeof vi.fn>;
  let overviewLoadParams: WritableSignal<{ readonly organizationId: string } | undefined>;

  let assetGrowthQueryData: WritableSignal<{
    readonly equipment?: OrganizationDashboardTrendOutput | null;
    readonly facilities?: OrganizationDashboardTrendOutput | null;
  } | null>;
  let assetGrowthQueryHasError: WritableSignal<boolean>;
  let assetGrowthIsQueryLoading: WritableSignal<boolean>;
  let assetGrowthAlignedTrendData: WritableSignal<AlignedDashboardTrendSeries>;
  let canReadEquipment: WritableSignal<boolean>;
  let canReadFacilities: WritableSignal<boolean>;
  let assetGrowthSetGranularity: ReturnType<typeof vi.fn>;
  let assetGrowthSetDateRange: ReturnType<typeof vi.fn>;
  let assetGrowthSetCompareEnabled: ReturnType<typeof vi.fn>;
  let assetGrowthLoad: ReturnType<typeof vi.fn>;
  let assetGrowthLoadParams: WritableSignal<{ readonly organizationId: string } | undefined>;

  async function render(): Promise<void> {
    dashboardQueryData = signal<OrganizationDashboardOutput | null>(null);
    dashboardQueryHasError = signal<boolean>(false);
    dashboardQueryError = signal<StoreError | null>(null);
    dashboardIsQueryLoading = signal<boolean>(false);
    facilityCount = signal<number | string | null>(12);
    equipmentCount = signal<number | string | null>(34);
    facilitiesComparison = signal({ value: 2, direction: 'up' });
    equipmentComparison = signal({ value: 1, direction: 'down' });
    inspectionsComparison = signal({ value: 3, direction: 'up' });
    dashboardLoad = vi.fn();

    overviewQueryData = signal(null);
    overviewQueryHasError = signal<boolean>(false);
    overviewQueryError = signal<StoreError | null>(null);
    overviewIsQueryLoading = signal<boolean>(false);
    overviewAlignedTrendData = signal<AlignedDashboardTrendSeries>(emptyAlignedTrend());
    overviewSetGranularity = vi.fn();
    overviewSetDateRange = vi.fn();
    overviewSetCompareEnabled = vi.fn();
    overviewLoad = vi.fn();
    overviewLoadParams = signal<{ readonly organizationId: string } | undefined>({
      organizationId: 'org-1',
    });

    assetGrowthQueryData = signal(null);
    assetGrowthQueryHasError = signal<boolean>(false);
    assetGrowthIsQueryLoading = signal<boolean>(false);
    assetGrowthAlignedTrendData = signal<AlignedDashboardTrendSeries>(emptyAlignedTrend());
    canReadEquipment = signal<boolean>(true);
    canReadFacilities = signal<boolean>(true);
    assetGrowthSetGranularity = vi.fn();
    assetGrowthSetDateRange = vi.fn();
    assetGrowthSetCompareEnabled = vi.fn();
    assetGrowthLoad = vi.fn();
    assetGrowthLoadParams = signal<{ readonly organizationId: string } | undefined>({
      organizationId: 'org-1',
    });

    const dashboardStoreMock = {
      queryData: dashboardQueryData,
      queryHasError: dashboardQueryHasError,
      queryError: dashboardQueryError,
      isQueryLoading: dashboardIsQueryLoading,
      facilityCount,
      equipmentCount,
      facilitiesComparison,
      equipmentComparison,
      inspectionsComparison,
      load: dashboardLoad,
    };

    const overviewTrendStoreMock = {
      queryData: overviewQueryData,
      queryHasError: overviewQueryHasError,
      queryError: overviewQueryError,
      isQueryLoading: overviewIsQueryLoading,
      alignedTrendData: overviewAlignedTrendData,
      setGranularity: overviewSetGranularity,
      setDateRange: overviewSetDateRange,
      setCompareEnabled: overviewSetCompareEnabled,
      load: overviewLoad,
      loadParams: overviewLoadParams,
    };

    const assetGrowthTrendStoreMock = {
      queryData: assetGrowthQueryData,
      queryHasError: assetGrowthQueryHasError,
      isQueryLoading: assetGrowthIsQueryLoading,
      alignedTrendData: assetGrowthAlignedTrendData,
      canReadEquipment,
      canReadFacilities,
      setGranularity: assetGrowthSetGranularity,
      setDateRange: assetGrowthSetDateRange,
      setCompareEnabled: assetGrowthSetCompareEnabled,
      load: assetGrowthLoad,
      loadParams: assetGrowthLoadParams,
    };

    const themePort: Pick<ThemePort, 'resolvedTheme'> = {
      resolvedTheme: signal<'light' | 'dark'>('light'),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: THEME_PORT, useValue: themePort },
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: {
            selectedOrganizationId: signal<string | null>('org-1'),
            selectedOrganization: signal<OrganizationOutput | null>({
              name: 'Acme Corp',
            } as unknown as OrganizationOutput),
            isLoadingOrganization: signal(false),
          },
        },
      ],
    });

    TestBed.overrideComponent(OrganizationStatisticsPage, {
      set: {
        providers: [
          { provide: DashboardStore, useValue: dashboardStoreMock },
          { provide: OverviewTrendStore, useValue: overviewTrendStoreMock },
          { provide: AssetGrowthTrendStore, useValue: assetGrowthTrendStoreMock },
        ],
      },
    });

    TestBed.overrideComponent(OrganizationStatisticsPage, {
      remove: { imports: [LineChart] },
      add: { imports: [LineChartStub] },
    });

    fixture = TestBed.createComponent(OrganizationStatisticsPage);
    await fixture.whenStable();
  }

  it('renders the KPI tiles from the dashboard store', async () => {
    await render();
    dashboardQueryData.set(dashboardData());
    await fixture.whenStable();

    const text: string = fixture.nativeElement.textContent;

    expect(text).toContain('12');
    expect(text).toContain('34');
    expect(text).toContain('42');
    expect(text).toContain('7');
    expect(text).toContain('2 overdue');
    expect(text).toContain('88%');
  });

  it('points the facility and equipment KPI tiles at their mounted lists, not the unmounted assets explorer', async () => {
    await render();
    dashboardQueryData.set(dashboardData());
    await fixture.whenStable();

    const facilities: HTMLAnchorElement | null = fixture.nativeElement.querySelector(
      '[data-testid="org-statistics-kpi-facilities"] a',
    );
    const equipment: HTMLAnchorElement | null = fixture.nativeElement.querySelector(
      '[data-testid="org-statistics-kpi-equipment"] a',
    );

    expect(facilities?.getAttribute('href')).toBe('/organizations/org-1/facilities');
    expect(equipment?.getAttribute('href')).toBe('/organizations/org-1/equipments');
  });

  it('shows KPI deltas while the compare toggle is on (the default)', async () => {
    await render();
    dashboardQueryData.set(dashboardData());
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('+2');
  });

  it('hides KPI deltas once the compare toggle is switched off', async () => {
    await render();
    dashboardQueryData.set(dashboardData());
    await fixture.whenStable();

    (fixture.componentInstance as unknown as { compareToPreviousPeriod: WritableSignal<boolean> })[
      'compareToPreviousPeriod'
    ].set(false);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('+2');
  });

  it('forwards the compare toggle to both trend stores', async () => {
    await render();
    overviewSetCompareEnabled.mockClear();
    assetGrowthSetCompareEnabled.mockClear();

    (fixture.componentInstance as unknown as { compareToPreviousPeriod: WritableSignal<boolean> })[
      'compareToPreviousPeriod'
    ].set(false);
    await fixture.whenStable();

    expect(overviewSetCompareEnabled).toHaveBeenLastCalledWith(false);
    expect(assetGrowthSetCompareEnabled).toHaveBeenLastCalledWith(false);
  });

  it('applies the matching granularity and date range to both trend stores for each period preset', async () => {
    await render();
    overviewSetGranularity.mockClear();
    assetGrowthSetGranularity.mockClear();

    (fixture.componentInstance as unknown as { onPeriodChanged: (v: string) => void })[
      'onPeriodChanged'
    ]('90d');
    await fixture.whenStable();

    expect(overviewSetGranularity).toHaveBeenLastCalledWith('week');
    expect(assetGrowthSetGranularity).toHaveBeenLastCalledWith('week');
    expect(overviewSetDateRange).toHaveBeenLastCalledWith(
      expect.arrayContaining([expect.any(Date), expect.any(Date)]),
    );

    (fixture.componentInstance as unknown as { onPeriodChanged: (v: string) => void })[
      'onPeriodChanged'
    ]('12m');
    await fixture.whenStable();

    expect(overviewSetGranularity).toHaveBeenLastCalledWith('month');
    expect(assetGrowthSetGranularity).toHaveBeenLastCalledWith('month');

    (fixture.componentInstance as unknown as { onPeriodChanged: (v: string) => void })[
      'onPeriodChanged'
    ]('unexpected');
    await fixture.whenStable();

    expect(overviewSetGranularity).toHaveBeenLastCalledWith('day');
  });

  it('renders the forbidden card, not the generic error state, for a 403 dashboard query', async () => {
    await render();
    dashboardQueryHasError.set(true);
    dashboardQueryError.set(storeError(403));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Not available with your permissions');
    expect(fixture.nativeElement.querySelector('app-error-state')).toBeNull();
  });

  it('renders the generic error state and retries through the dashboard store for a non-403 failure', async () => {
    await render();
    dashboardQueryHasError.set(true);
    dashboardQueryError.set(storeError(500));
    await fixture.whenStable();

    const errorState: HTMLElement | null = fixture.nativeElement.querySelector('app-error-state');

    expect(errorState).not.toBeNull();

    (errorState as HTMLElement).querySelector<HTMLButtonElement>('button')?.click();

    expect(dashboardLoad).toHaveBeenCalledWith('org-1');
  });

  it('hides the severity card and the trend charts grid behind the forbidden card on a 403 dashboard query', async () => {
    await render();
    dashboardQueryHasError.set(true);
    dashboardQueryError.set(storeError(403));
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('[data-testid="org-statistics-chart-inspections"]'),
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-testid^="org-statistics-severity-"]'),
    ).toBeNull();
  });

  it('hides the severity card and the trend charts grid behind the generic error state on a non-403 dashboard failure', async () => {
    await render();
    dashboardQueryHasError.set(true);
    dashboardQueryError.set(storeError(500));
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('[data-testid="org-statistics-chart-inspections"]'),
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-testid^="org-statistics-severity-"]'),
    ).toBeNull();
  });

  it('shows the severity card and the trend charts grid once the dashboard query settles', async () => {
    await render();
    dashboardQueryData.set(dashboardData());
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('[data-testid="org-statistics-chart-inspections"]'),
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-testid^="org-statistics-severity-"]'),
    ).not.toBeNull();
  });

  it('shows the severity skeleton while the dashboard query is loading', async () => {
    await render();
    dashboardIsQueryLoading.set(true);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
  });

  it('reports no non-conformities recorded when every severity is zero', async () => {
    await render();
    dashboardQueryData.set({
      overview: { nonConformities: { summary: [] } },
      health: {},
      comparison: {},
    } as unknown as OrganizationDashboardOutput);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No non-conformities recorded');
  });

  it('orders the severity breakdown from critical to low with their counts', async () => {
    await render();
    dashboardQueryData.set(dashboardData());
    await fixture.whenStable();

    const text: string = fixture.nativeElement.textContent;
    const criticalIndex: number = text.indexOf('Critical');
    const highIndex: number = text.indexOf('High');
    const mediumIndex: number = text.indexOf('Medium');
    const lowIndex: number = text.indexOf('Low');

    expect(criticalIndex).toBeGreaterThan(-1);
    expect(criticalIndex).toBeLessThan(highIndex);
    expect(highIndex).toBeLessThan(mediumIndex);
    expect(mediumIndex).toBeLessThan(lowIndex);
  });

  it('renders each severity row as a proportional bar sized to its share of the total', async () => {
    await render();
    dashboardQueryData.set(dashboardData());
    await fixture.whenStable();

    const criticalRow: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="org-statistics-severity-critical"]',
    );
    const bar: HTMLElement | null | undefined = criticalRow?.querySelector('hlm-progress');

    expect(bar).not.toBeNull();
    expect(bar?.getAttribute('aria-valuenow')).toBe('14');
  });

  it('wires the inspections chart series, label and loading state to the chart', async () => {
    await render();
    overviewAlignedTrendData.set({
      buckets: ['2026-01-01'],
      labels: ['01 Jan 2026'],
      datasets: [[9], [1], [2]],
    });
    overviewIsQueryLoading.set(true);
    await fixture.whenStable();

    const charts: LineChartStub[] = renderedCharts(fixture);
    const inspectionsChart: LineChartStub | undefined = charts.find(
      (chart: LineChartStub): boolean => chart.label() === 'Inspections performed over time',
    );

    expect(inspectionsChart).toBeDefined();
    expect(inspectionsChart?.series()).toEqual([
      { name: 'Inspections', points: [{ label: '01 Jan 2026', value: 9 }] },
    ]);
    expect(inspectionsChart?.loading()).toBe(true);
  });

  it('shows the permission line for the inspections chart on a 403, without rendering the chart', async () => {
    await render();
    overviewQueryHasError.set(true);
    overviewQueryError.set(storeError(403));
    await fixture.whenStable();

    const card: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="org-statistics-chart-inspections"]',
    );

    expect(card?.textContent).toContain('Not available with your permissions');
    expect(card?.querySelector('button')).toBeNull();
  });

  it('shows the per-chart error line for the inspections chart on a non-403 failure and retries through the overview trend store', async () => {
    await render();
    overviewQueryHasError.set(true);
    overviewQueryError.set(storeError(500));
    await fixture.whenStable();

    const card: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="org-statistics-chart-inspections"]',
    );

    expect(card?.textContent).toContain('This chart could not be loaded');

    card?.querySelector<HTMLButtonElement>('button')?.click();

    expect(overviewLoad).toHaveBeenCalledWith({ organizationId: 'org-1' });
  });

  it('shows the permission line for the equipment chart when the store denies equipment reads', async () => {
    await render();
    canReadEquipment.set(false);
    await fixture.whenStable();

    const charts: LineChartStub[] = renderedCharts(fixture);

    expect(charts.some((chart) => chart.label() === 'Equipment added over time')).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Not available with your permissions');
  });

  it('shows the per-chart error line for the equipment chart on a load failure and retries through the asset-growth trend store', async () => {
    await render();
    assetGrowthQueryHasError.set(true);
    await fixture.whenStable();

    const card: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="org-statistics-chart-equipment"]',
    );

    expect(card?.textContent).toContain('This chart could not be loaded');

    card?.querySelector<HTMLButtonElement>('button')?.click();

    expect(assetGrowthLoad).toHaveBeenCalledWith({ organizationId: 'org-1' });
  });

  it('shows the permission line for the facilities chart when the store denies facility reads', async () => {
    await render();
    canReadFacilities.set(false);
    await fixture.whenStable();

    const charts: LineChartStub[] = renderedCharts(fixture);

    expect(charts.some((chart) => chart.label() === 'Facilities added over time')).toBe(false);
  });

  it('renders the equipment and facilities charts once permitted', async () => {
    await render();

    const charts: LineChartStub[] = renderedCharts(fixture);

    expect(charts.some((chart) => chart.label() === 'Equipment added over time')).toBe(true);
    expect(charts.some((chart) => chart.label() === 'Facilities added over time')).toBe(true);
  });
});
