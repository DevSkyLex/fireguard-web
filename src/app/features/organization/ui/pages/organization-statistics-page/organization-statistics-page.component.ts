import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBuilding2,
  lucideCircleAlert,
  lucideCircleDotDashed,
  lucideClipboardCheck,
  lucideLock,
  lucideOctagonAlert,
  lucideRefreshCw,
  lucideShieldCheck,
  lucideTriangleAlert,
  lucideWrench,
} from '@ng-icons/lucide';
import type { StoreError } from '@core/request-state';
import {
  resolveInspectionStatusTag,
  type InspectionStatusTagDescriptor,
  type NonConformitySeverity,
} from '@features/organization/features/inspections/models';
import type { OrganizationDashboardGranularity } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import {
  AssetGrowthTrendStore,
  DashboardStore,
  OverviewTrendStore,
} from '@features/organization/state/organization-dashboard';
import {
  OrganizationPageHeader,
  OrganizationTrendChartNotice,
  StatTile,
  type StatTileDelta,
  type StatTileDeltaDirection,
  type StatTileLink,
} from '@features/organization/ui/components';
import {
  getOrganizationDashboardHealthComparisonDelta,
  getOrganizationDashboardHealthValue,
  getOrganizationDashboardNonConformitySeverityBreakdown,
  getOrganizationDashboardOverviewMetricValue,
  mapAlignedDashboardTrendSeriesToChartSeries,
} from '@features/organization/utils';
import { LineChart, type ChartSeries } from '@shared/chart';
import { ErrorState } from '@shared/error-state';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmProgressImports } from '@shared/ui/progress';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmSwitch } from '@shared/ui/switch';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';

/**
 * Type OrganizationStatisticsPeriodPreset
 *
 * @description
 * The four ranges the page's period selector offers. Feature-local, not a
 * backend enum: it only decides the `{from, to}` window and default
 * granularity forwarded to the trend stores.
 *
 * @since 1.0.0
 */
type OrganizationStatisticsPeriodPreset = '7d' | '30d' | '90d' | '12m';

/**
 * Type OrganizationStatisticsKpiTile
 *
 * @description
 * View-model for one `app-stat-tile` in the page's KPI row.
 *
 * @since 1.0.0
 */
type OrganizationStatisticsKpiTile = {
  readonly id: string;
  readonly label: string;
  readonly value: string | number;
  readonly description: string | null;
  readonly icon: string;
  readonly delta: StatTileDelta | null;
  readonly link: StatTileLink | null;
};

/**
 * Type OrganizationStatisticsSeverityEntry
 *
 * @description
 * View-model for one row of the non-conformity severity breakdown: its
 * count and, for the proportional bar, what share of the breakdown's total
 * that count is (0 when the total itself is 0).
 *
 * @since 1.1.0
 */
type OrganizationStatisticsSeverityEntry = {
  readonly severity: NonConformitySeverity;
  readonly count: number;
  readonly percent: number;
  readonly descriptor: InspectionStatusTagDescriptor;
};

/**
 * Component OrganizationStatisticsPage
 * @class OrganizationStatisticsPage
 *
 * @description
 * The organization's statistics surface: KPI counts and their
 * period-over-period deltas, four trend charts, and a non-conformity
 * severity breakdown, all driven by one page-level period selector (a
 * preset range plus a compare-to-previous-period toggle).
 *
 * The period selector drives {@link OverviewTrendStore} and
 * {@link AssetGrowthTrendStore} directly through their own filter setters —
 * both already manage granularity, date range and comparison reactively, so
 * this page never re-implements that fetch logic. {@link DashboardStore}
 * exposes no such setters: it always reports its own fixed near-term window
 * (`ARCHITECTURE.md` requires this page not to touch that store's
 * internals), so the KPI row is a snapshot of "right now" rather than of the
 * selected period; only the compare toggle governs whether its deltas render.
 *
 * `OverviewTrendStore` alone supplies both the Inspections and the
 * Non-conformities opened/resolved charts (it already fetches all three
 * series in one `forkJoin`), so this page does not additionally provide the
 * single-metric `NonConformitiesOpenedTrendStore` /
 * `NonConformitiesResolvedTrendStore` slices, which would only duplicate
 * those two network calls.
 *
 * A section whose backing store reports a 403 renders a muted
 * "not available with your permissions" card instead of the chart or KPI
 * row it would otherwise hold; `AssetGrowthTrendStore`'s own
 * `canReadEquipment` / `canReadFacilities` computed signals gate the
 * equipment and facilities charts individually, ahead of any request.
 *
 * The KPI row, the severity card and the four trend-chart cards render only
 * once {@link DashboardStore}'s own query has actually succeeded — a
 * dashboard failure shows the page-level forbidden card or `app-error-state`
 * alone, never underneath it. The two trend stores keep loading independently
 * of that gate (their own filter-driven `rxMethod`, wired in the
 * constructor), so switching back to a healthy dashboard state shows
 * whatever they had already resolved.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-statistics-page',
  imports: [
    NgIcon,
    ErrorState,
    LineChart,
    OrganizationPageHeader,
    OrganizationTrendChartNotice,
    StatTile,
    HlmButton,
    HlmSkeleton,
    HlmSwitch,
    ...HlmCardImports,
    ...HlmFieldImports,
    ...HlmProgressImports,
    ...HlmToggleGroupImports,
  ],
  providers: [
    DashboardStore,
    OverviewTrendStore,
    AssetGrowthTrendStore,
    provideIcons({
      lucideBuilding2,
      lucideCircleAlert,
      lucideCircleDotDashed,
      lucideClipboardCheck,
      lucideLock,
      lucideOctagonAlert,
      lucideRefreshCw,
      lucideShieldCheck,
      lucideTriangleAlert,
      lucideWrench,
    }),
  ],
  templateUrl: './organization-statistics-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationStatisticsPage {
  //#region Properties
  /**
   * Property dashboardStore
   * @readonly
   *
   * @description
   * Owns the aggregate `/dashboard` payload: overview counts, health rates,
   * the previous-period comparison, and the non-conformity severity
   * breakdown.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {DashboardStore}
   */
  protected readonly dashboardStore: DashboardStore = inject<DashboardStore>(DashboardStore);

  /**
   * Property overviewTrendStore
   * @readonly
   *
   * @description
   * Owns the combined inspections / non-conformities-opened /
   * non-conformities-resolved trend datasets backing the Inspections and the
   * Non-conformities opened vs resolved charts.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {OverviewTrendStore}
   */
  protected readonly overviewTrendStore: OverviewTrendStore =
    inject<OverviewTrendStore>(OverviewTrendStore);

  /**
   * Property assetGrowthTrendStore
   * @readonly
   *
   * @description
   * Owns the combined equipment-created / facilities-created trend datasets
   * backing the Equipment added and Facilities added charts.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {AssetGrowthTrendStore}
   */
  protected readonly assetGrowthTrendStore: AssetGrowthTrendStore =
    inject<AssetGrowthTrendStore>(AssetGrowthTrendStore);

  /**
   * Property organizationContext
   * @readonly
   *
   * @description
   * The routed organization, used to identify the header and to build KPI
   * tile destinations.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {OrganizationContextPort}
   */
  protected readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property selectedPeriod
   * @readonly
   *
   * @description
   * The active preset range. Defaults to 30 days — a window wide enough to
   * show a trend without asking for the full year up front.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<OrganizationStatisticsPeriodPreset>}
   */
  protected readonly selectedPeriod: WritableSignal<OrganizationStatisticsPeriodPreset> =
    signal<OrganizationStatisticsPeriodPreset>('30d');

  /**
   * Property compareToPreviousPeriod
   * @readonly
   *
   * @description
   * Whether the trend charts fetch a comparison series and the KPI row shows
   * its deltas. Defaults on: the deltas are what turn a bare count into a
   * trend signal.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly compareToPreviousPeriod: WritableSignal<boolean> = signal<boolean>(true);

  /**
   * Property pageTitle
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly pageTitle: string = $localize`:@@org.statistics.pageTitle:Statistics`;

  /**
   * Property pageSubtitle
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly pageSubtitle: string = $localize`:@@org.statistics.pageSubtitle:Track facility, member, equipment, and inspection trends across your organization.`;

  /**
   * Property severitySkeletonRows
   * @readonly
   *
   * @description
   * Placeholder row count shown while the severity breakdown loads.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly number[]}
   */
  protected readonly severitySkeletonRows: readonly number[] = [0, 1, 2, 3];

  /**
   * Property forbiddenMessage
   * @readonly
   *
   * @description
   * The message a trend chart card shows in place of its plot when its
   * backing store denies the read outright (403) — the same sentence the
   * page-level dashboard-forbidden card already uses.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {string}
   */
  protected readonly forbiddenMessage: string = $localize`:@@org.statistics.forbidden:Not available with your permissions.`;

  /**
   * Property trendLoadErrorMessage
   * @readonly
   *
   * @description
   * The message a trend chart card shows in place of its plot when its
   * backing store failed for any other reason.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {string}
   */
  protected readonly trendLoadErrorMessage: string = $localize`:@@org.statistics.trend.loadError:This chart could not be loaded.`;

  /**
   * Property inspectionsSeriesName
   * @readonly
   *
   * @description
   * Shared label for the Inspections chart's card title and its single
   * series name.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly inspectionsSeriesName: string = $localize`:@@org.statistics.trend.inspections.title:Inspections`;

  /**
   * Property inspectionsChartLabel
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly inspectionsChartLabel: string = $localize`:@@org.statistics.trend.inspections.chartLabel:Inspections performed over time`;

  /**
   * Property nonConformitiesChartTitle
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly nonConformitiesChartTitle: string = $localize`:@@org.statistics.trend.nonConformities.title:Non-conformities opened vs resolved`;

  /**
   * Property nonConformitiesChartLabel
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly nonConformitiesChartLabel: string = $localize`:@@org.statistics.trend.nonConformities.chartLabel:Non-conformities opened and resolved over time`;

  /**
   * Property nonConformitiesOpenedSeriesName
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly nonConformitiesOpenedSeriesName: string = $localize`:@@org.statistics.trend.nonConformities.seriesOpened:Opened`;

  /**
   * Property nonConformitiesResolvedSeriesName
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly nonConformitiesResolvedSeriesName: string = $localize`:@@org.statistics.trend.nonConformities.seriesResolved:Resolved`;

  /**
   * Property equipmentSeriesName
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly equipmentSeriesName: string = $localize`:@@org.statistics.trend.equipment.title:Equipment added`;

  /**
   * Property equipmentChartLabel
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly equipmentChartLabel: string = $localize`:@@org.statistics.trend.equipment.chartLabel:Equipment added over time`;

  /**
   * Property facilitiesSeriesName
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly facilitiesSeriesName: string = $localize`:@@org.statistics.trend.facilities.title:Facilities added`;

  /**
   * Property facilitiesChartLabel
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly facilitiesChartLabel: string = $localize`:@@org.statistics.trend.facilities.chartLabel:Facilities added over time`;

  /**
   * Property kpiTiles
   * @readonly
   *
   * @description
   * The KPI row's view-models: facility, equipment and completed-inspection
   * totals with their period comparison, the current open non-conformity
   * count, and the non-conformity resolution rate. Each tile links to the
   * section it counts; facilities and equipment route to their own lists
   * rather than the `assets` explorer, which is not mounted yet
   * (`FEATURE.md`).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly OrganizationStatisticsKpiTile[]>}
   */
  protected readonly kpiTiles: Signal<readonly OrganizationStatisticsKpiTile[]> = computed(() => {
    const data = this.dashboardStore.queryData();
    const overview = data?.overview;
    const health = data?.health;
    const comparison = data?.comparison;
    const organizationId: string | null = this.organizationContext.selectedOrganizationId();
    const showDelta: boolean = this.compareToPreviousPeriod();

    const inspectionsCompleted: number | null = getOrganizationDashboardOverviewMetricValue(
      overview,
      'inspections',
      'closed',
    );
    const openNonConformities: number | null = getOrganizationDashboardOverviewMetricValue(
      overview,
      'nonConformities',
      'open',
    );
    const overdueNonConformities: number | null = getOrganizationDashboardOverviewMetricValue(
      overview,
      'nonConformities',
      'overdue',
    );
    const resolutionRate: number | null = getOrganizationDashboardHealthValue(
      health,
      'nonConformityResolutionRate',
    );
    const facilitiesLink: StatTileLink | null = organizationId
      ? ['/organizations', organizationId, 'facilities']
      : null;
    const equipmentsLink: StatTileLink | null = organizationId
      ? ['/organizations', organizationId, 'equipments']
      : null;
    const inspectionsLink: StatTileLink | null = organizationId
      ? ['/organizations', organizationId, 'inspections']
      : null;

    return [
      {
        id: 'facilities',
        label: $localize`:@@org.statistics.kpi.facilities:Facilities`,
        value: this.dashboardStore.facilityCount() ?? '—',
        description: null,
        icon: 'lucideBuilding2',
        delta: showDelta
          ? this.toComparisonDelta(this.dashboardStore.facilitiesComparison(), true)
          : null,
        link: facilitiesLink,
      },
      {
        id: 'equipment',
        label: $localize`:@@org.statistics.kpi.equipment:Equipment`,
        value: this.dashboardStore.equipmentCount() ?? '—',
        description: null,
        icon: 'lucideWrench',
        delta: showDelta
          ? this.toComparisonDelta(this.dashboardStore.equipmentComparison(), true)
          : null,
        link: equipmentsLink,
      },
      {
        id: 'inspections-completed',
        label: $localize`:@@org.statistics.kpi.inspectionsCompleted:Inspections completed`,
        value: inspectionsCompleted ?? '—',
        description: null,
        icon: 'lucideClipboardCheck',
        delta: showDelta
          ? this.toComparisonDelta(this.dashboardStore.inspectionsComparison(), true)
          : null,
        link: inspectionsLink,
      },
      {
        id: 'open-non-conformities',
        label: $localize`:@@org.statistics.kpi.openNonConformities:Open non-conformities`,
        value: openNonConformities ?? '—',
        description:
          overdueNonConformities !== null && overdueNonConformities > 0
            ? $localize`:@@org.statistics.kpi.openNonConformitiesOverdue:${overdueNonConformities}:count: overdue`
            : null,
        icon: 'lucideTriangleAlert',
        delta: null,
        link: inspectionsLink,
      },
      {
        id: 'resolution-rate',
        label: $localize`:@@org.statistics.kpi.resolutionRate:Non-conformity resolution rate`,
        value: resolutionRate !== null ? `${Math.round(resolutionRate)}%` : '—',
        description: null,
        icon: 'lucideShieldCheck',
        delta: showDelta
          ? this.toHealthComparisonDelta(
              getOrganizationDashboardHealthComparisonDelta(
                comparison,
                'nonConformityResolutionRate',
              ),
              true,
            )
          : null,
        link: null,
      },
    ];
  });

  /**
   * Property severityBreakdown
   * @readonly
   *
   * @description
   * The current open+unresolved non-conformity count per severity, ordered
   * from critical to low, each paired with its registry descriptor and its
   * share of the breakdown's own total — the proportional bar's width.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<readonly OrganizationStatisticsSeverityEntry[]>}
   */
  protected readonly severityBreakdown: Signal<readonly OrganizationStatisticsSeverityEntry[]> =
    computed(() => {
      const raw = getOrganizationDashboardNonConformitySeverityBreakdown(
        this.dashboardStore.queryData()?.overview,
      );
      const total: number = raw.reduce((sum, entry) => sum + entry.count, 0);

      return raw.map((entry): OrganizationStatisticsSeverityEntry => ({
        severity: entry.severity,
        count: entry.count,
        percent: total > 0 ? Math.round((entry.count / total) * 100) : 0,
        descriptor: resolveInspectionStatusTag('nonConformitySeverity', entry.severity),
      }));
    });

  /**
   * Property severityTotal
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly severityTotal: Signal<number> = computed(() =>
    this.severityBreakdown().reduce((sum, entry) => sum + entry.count, 0),
  );

  /**
   * Property severitySummaryLine
   * @readonly
   *
   * @description
   * The severity card's subtitle: how many open, unresolved non-conformities
   * the breakdown covers right now — a current snapshot, not scoped to the
   * page's own period selector, since `DashboardStore` never applies it.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<string>}
   */
  protected readonly severitySummaryLine: Signal<string> = computed(() => {
    const total: number = this.severityTotal();

    return total === 1
      ? $localize`:@@org.statistics.severity.summaryOne:1 open and unresolved`
      : $localize`:@@org.statistics.severity.summaryMany:${total}:total: open and unresolved`;
  });

  /**
   * Property inspectionsChartSeries
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ChartSeries[]>}
   */
  protected readonly inspectionsChartSeries: Signal<ChartSeries[]> = computed(() =>
    mapAlignedDashboardTrendSeriesToChartSeries(this.overviewTrendStore.alignedTrendData(), [
      { name: this.inspectionsSeriesName, index: 0 },
    ]),
  );

  /**
   * Property nonConformitiesChartSeries
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ChartSeries[]>}
   */
  protected readonly nonConformitiesChartSeries: Signal<ChartSeries[]> = computed(() =>
    mapAlignedDashboardTrendSeriesToChartSeries(this.overviewTrendStore.alignedTrendData(), [
      { name: this.nonConformitiesOpenedSeriesName, index: 1 },
      { name: this.nonConformitiesResolvedSeriesName, index: 2 },
    ]),
  );

  /**
   * Property equipmentChartSeries
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ChartSeries[]>}
   */
  protected readonly equipmentChartSeries: Signal<ChartSeries[]> = computed(() =>
    mapAlignedDashboardTrendSeriesToChartSeries(this.assetGrowthTrendStore.alignedTrendData(), [
      { name: this.equipmentSeriesName, index: 0 },
    ]),
  );

  /**
   * Property facilitiesChartSeries
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ChartSeries[]>}
   */
  protected readonly facilitiesChartSeries: Signal<ChartSeries[]> = computed(() =>
    mapAlignedDashboardTrendSeriesToChartSeries(this.assetGrowthTrendStore.alignedTrendData(), [
      { name: this.facilitiesSeriesName, index: 1 },
    ]),
  );

  /**
   * Property inspectionsSummaryLine
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly inspectionsSummaryLine: Signal<string | null> = computed(() => {
    const output = this.overviewTrendStore.queryData()?.inspections;

    return this.formatTrendSummaryLine(
      output?.summary?.['total'],
      output?.comparison?.mode,
      output?.comparison?.summary?.['delta'],
    );
  });

  /**
   * Property nonConformitiesSummaryLine
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly nonConformitiesSummaryLine: Signal<string | null> = computed(() => {
    const data = this.overviewTrendStore.queryData();
    const openedTotal = data?.ncOpened?.summary?.['total'];
    const resolvedTotal = data?.ncResolved?.summary?.['total'];

    if (typeof openedTotal !== 'number' || typeof resolvedTotal !== 'number') return null;

    return $localize`:@@org.statistics.trend.nonConformitiesSummary:${openedTotal}:opened: opened, ${resolvedTotal}:resolved: resolved this period`;
  });

  /**
   * Property equipmentSummaryLine
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly equipmentSummaryLine: Signal<string | null> = computed(() => {
    const output = this.assetGrowthTrendStore.queryData()?.equipment;

    return this.formatTrendSummaryLine(
      output?.summary?.['total'],
      output?.comparison?.mode,
      output?.comparison?.summary?.['delta'],
    );
  });

  /**
   * Property facilitiesSummaryLine
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly facilitiesSummaryLine: Signal<string | null> = computed(() => {
    const output = this.assetGrowthTrendStore.queryData()?.facilities;

    return this.formatTrendSummaryLine(
      output?.summary?.['total'],
      output?.comparison?.mode,
      output?.comparison?.summary?.['delta'],
    );
  });
  //#endregion

  //#region Lifecycle
  /**
   * Constructor
   *
   * @description
   * Wires the page's period selector to both trend stores so a preset or
   * compare-toggle change refetches every trend chart in one place.
   *
   * @since 1.0.0
   */
  constructor() {
    effect(() => {
      this.applyPeriodToTrendStores(this.selectedPeriod(), this.compareToPreviousPeriod());
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onPeriodChanged
   * @method onPeriodChanged
   *
   * @description
   * Narrows `hlm-toggle-group`'s single/multi-select payload before writing
   * {@link selectedPeriod}, mirroring how `facilities-page` narrows its own
   * layout toggle.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | readonly string[] | null | undefined} value - The toggle group's emitted value.
   *
   * @returns {void}
   */
  protected onPeriodChanged(value: string | readonly string[] | null | undefined): void {
    const preset: string | null = typeof value === 'string' ? value : null;

    this.selectedPeriod.set(
      preset === '7d' || preset === '90d' || preset === '12m' ? preset : '30d',
    );
  }

  /**
   * Method isForbidden
   * @method isForbidden
   *
   * @description
   * Whether a normalized store error is a 403 — the signal this page renders
   * as a muted "not available with your permissions" card rather than the
   * generic error state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {StoreError | null} error - The store's normalized query error.
   *
   * @returns {boolean} Whether the error is a permission denial.
   */
  protected isForbidden(error: StoreError | null): boolean {
    return error?.code === 403;
  }

  /**
   * Method retryDashboard
   * @method retryDashboard
   *
   * @description
   * Re-runs the aggregate dashboard query after a non-permission failure.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected retryDashboard(): void {
    this.dashboardStore.load(this.organizationContext.selectedOrganizationId() ?? undefined);
  }

  /**
   * Method retryOverviewTrend
   * @method retryOverviewTrend
   *
   * @description
   * Re-runs the Inspections / Non-conformities trend query with the
   * currently applied filters, for that card's own Retry action.
   *
   * @access protected
   * @since 1.1.0
   *
   * @returns {void}
   */
  protected retryOverviewTrend(): void {
    this.overviewTrendStore.load(this.overviewTrendStore.loadParams());
  }

  /**
   * Method retryAssetGrowthTrend
   * @method retryAssetGrowthTrend
   *
   * @description
   * Re-runs the Equipment / Facilities trend query with the currently
   * applied filters, for that card's own Retry action.
   *
   * @access protected
   * @since 1.1.0
   *
   * @returns {void}
   */
  protected retryAssetGrowthTrend(): void {
    this.assetGrowthTrendStore.load(this.assetGrowthTrendStore.loadParams());
  }
  //#endregion

  //#region Internals
  /**
   * Method applyPeriodToTrendStores
   * @method applyPeriodToTrendStores
   *
   * @description
   * Resolves one preset into a date range and granularity, then applies it
   * — along with the compare toggle — to both trend stores. Granularity is
   * set before the date range on each store, since the stores clamp the
   * range to the granularity's own maximum span.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {OrganizationStatisticsPeriodPreset} preset - The selected preset range.
   * @param {boolean} compare - Whether to fetch the previous-period comparison.
   *
   * @returns {void}
   */
  private applyPeriodToTrendStores(
    preset: OrganizationStatisticsPeriodPreset,
    compare: boolean,
  ): void {
    const { range, granularity } = this.resolvePeriodRange(preset);

    this.overviewTrendStore.setGranularity(granularity);
    this.overviewTrendStore.setDateRange(range);
    this.overviewTrendStore.setCompareEnabled(compare);

    this.assetGrowthTrendStore.setGranularity(granularity);
    this.assetGrowthTrendStore.setDateRange(range);
    this.assetGrowthTrendStore.setCompareEnabled(compare);
  }

  /**
   * Method resolvePeriodRange
   * @method resolvePeriodRange
   *
   * @description
   * Maps one preset to a concrete `[from, to]` date range ending now and the
   * granularity best suited to it — days for the two short ranges, weeks for
   * the quarter, months for the year, each comfortably under
   * `getDashboardMaxRangeDays`' cap for that granularity.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {OrganizationStatisticsPeriodPreset} preset - The selected preset range.
   *
   * @returns {{ readonly range: Date[]; readonly granularity: OrganizationDashboardGranularity }} The resolved range and granularity.
   */
  private resolvePeriodRange(preset: OrganizationStatisticsPeriodPreset): {
    readonly range: Date[];
    readonly granularity: OrganizationDashboardGranularity;
  } {
    const to = new Date();
    const from = new Date(to);

    switch (preset) {
      case '7d':
        from.setDate(from.getDate() - 7);
        return { range: [from, to], granularity: 'day' };
      case '90d':
        from.setDate(from.getDate() - 90);
        return { range: [from, to], granularity: 'week' };
      case '12m':
        from.setMonth(from.getMonth() - 12);
        return { range: [from, to], granularity: 'month' };
      default:
        from.setDate(from.getDate() - 30);
        return { range: [from, to], granularity: 'day' };
    }
  }

  /**
   * Method toComparisonDelta
   * @method toComparisonDelta
   *
   * @description
   * Converts one of `DashboardStore`'s `*Comparison` signals — a pre-signed
   * string magnitude and a literal direction — into the `StatTileDelta`
   * shape `app-stat-tile` accepts.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {{ readonly value: string | number | null; readonly direction: string | null } | null} entry - The store's comparison delta.
   * @param {boolean} positiveIsGood - Whether `up` is the desirable direction for this metric.
   *
   * @returns {StatTileDelta | null} The tile delta, or `null` when no comparison is available.
   */
  private toComparisonDelta(
    entry: { readonly value: string | number | null; readonly direction: string | null } | null,
    positiveIsGood: boolean,
  ): StatTileDelta | null {
    if (!entry || entry.direction === null) return null;

    const direction: StatTileDeltaDirection =
      entry.direction === 'up' ? 'up' : entry.direction === 'down' ? 'down' : 'flat';
    const magnitude: number = Math.abs(Number(entry.value ?? 0));

    if (!Number.isFinite(magnitude)) return null;

    return { value: magnitude, direction, positiveIsGood };
  }

  /**
   * Method toHealthComparisonDelta
   * @method toHealthComparisonDelta
   *
   * @description
   * Converts a health metric's period-over-period delta (percentage points)
   * into the `StatTileDelta` shape `app-stat-tile` accepts.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {{ readonly delta: number; readonly direction: string } | null} entry - The health metric's comparison delta.
   * @param {boolean} positiveIsGood - Whether `up` is the desirable direction for this metric.
   *
   * @returns {StatTileDelta | null} The tile delta, or `null` when no comparison is available.
   */
  private toHealthComparisonDelta(
    entry: { readonly delta: number; readonly direction: string } | null,
    positiveIsGood: boolean,
  ): StatTileDelta | null {
    if (!entry) return null;

    const direction: StatTileDeltaDirection =
      entry.direction === 'up' ? 'up' : entry.direction === 'down' ? 'down' : 'flat';
    const magnitude: number = Math.round(Math.abs(entry.delta) * 10) / 10;

    return { value: magnitude, direction, positiveIsGood };
  }

  /**
   * Method formatTrendSummaryLine
   * @method formatTrendSummaryLine
   *
   * @description
   * Formats one trend card's summary line: the period total alone, or the
   * total plus its signed percentage change when a previous-period
   * comparison was fetched.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {number | string | undefined} total - The trend output's `summary.total`.
   * @param {string | null | undefined} comparisonMode - The trend output's `comparison.mode`.
   * @param {number | string | undefined} delta - The trend output's `comparison.summary.delta`.
   *
   * @returns {string | null} The formatted line, or `null` when no total is available.
   */
  private formatTrendSummaryLine(
    total: number | string | undefined,
    comparisonMode: string | null | undefined,
    delta: number | string | undefined,
  ): string | null {
    if (typeof total !== 'number') return null;

    if (comparisonMode !== 'previous_period' || typeof delta !== 'number') {
      return $localize`:@@org.statistics.trend.summary:${total}:total: total this period`;
    }

    const roundedDelta: number = Math.round(delta * 10) / 10;
    const formattedDelta: string = roundedDelta > 0 ? `+${roundedDelta}` : `${roundedDelta}`;

    return $localize`:@@org.statistics.trend.summaryWithDelta:${total}:total: total this period, ${formattedDelta}:delta:% vs previous period`;
  }
  //#endregion
}
