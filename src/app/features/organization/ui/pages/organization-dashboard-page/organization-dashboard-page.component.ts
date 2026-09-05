import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBellRing,
  lucideBuilding2,
  lucideChevronRight,
  lucideCircleAlert,
  lucideCircleCheck,
  lucideCircleDotDashed,
  lucideClipboardCheck,
  lucideCloudUpload,
  lucideCompass,
  lucideEye,
  lucideLock,
  lucideMailWarning,
  lucideOctagonAlert,
  lucidePlus,
  lucideRefreshCw,
  lucideShieldCheck,
  lucideTriangleAlert,
  lucideUndo2,
  lucideWrench,
} from '@ng-icons/lucide';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import type { StoreError } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  resolveInspectionStatusTag,
  type InspectionStatusTagDescriptor,
  type NonConformitySeverity,
} from '@features/organization/features/inspections/models';
import { HlmCollapsibleImports } from '@shared/ui/collapsible';

import {
  ORGANIZATION_PERMISSION,
  type OrganizationDashboardGranularity,
} from '@features/organization/models';
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
  OrganizationTrendChartNotice,
  StatTile,
  type StatTileBadge,
  type StatTileDelta,
  type StatTileDeltaDirection,
  type StatTileLink,
  type StatTileTone,
} from '@features/organization/ui/components';

import {
  getOrganizationDashboardNonConformitySeverityBreakdown,
  getOrganizationDashboardOverviewMetricValue,
  mapAlignedDashboardTrendSeriesToChartSeries,
} from '@features/organization/utils';
import { LineChart, type ChartSeries } from '@shared/chart';

import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmProgressImports } from '@shared/ui/progress';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmSwitch } from '@shared/ui/switch';

import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';

/**
 * Type OrganizationDashboardKpiTile
 *
 * @description
 * View-model for one compact operational metric from the aggregate dashboard payload.
 * Period controls affect the charts only; the overdue badge qualifies open findings.
 *
 * @since 1.0.0
 */
type OrganizationDashboardKpiTile = {
  readonly id: string;
  readonly label: string;
  readonly value: string | number;
  readonly icon: string;
  readonly link: StatTileLink | null;
  readonly delta: StatTileDelta | null;
  readonly tone: StatTileTone;
  readonly badge: StatTileBadge | null;
};

/**
 * Type OrganizationDashboardTrendsPeriodPreset
 *
 * @description
 * The four ranges the Trends section's period selector offers. Feature-local,
 * not a backend enum: it only decides the `{from, to}` window and default
 * granularity forwarded to the trend stores.
 *
 * @since 1.0.0
 */
type OrganizationDashboardTrendsPeriodPreset = '7d' | '30d' | '90d' | '12m';

/**
 * Type OrganizationDashboardSeverityEntry
 *
 * @description
 * View-model for one row of the non-conformity severity breakdown: its
 * count and, for the proportional bar, what share of the breakdown's total
 * that count is (0 when the total itself is 0).
 *
 * @since 1.0.0
 */
type OrganizationDashboardSeverityEntry = {
  readonly severity: NonConformitySeverity;
  readonly count: number;
  readonly percent: number;
  readonly descriptor: InspectionStatusTagDescriptor;
};

/**
 * Component OrganizationDashboardPage
 * @class OrganizationDashboardPage
 *
 * @description
 * The organization landing shows four operational indicators and period-scoped trends.
 * Browser-only trend stores activate when the dashboard mounts; all panels
 * share the same aggregate dashboard store.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dashboard-page',
  imports: [
    ...HlmCollapsibleImports,
    NgIcon,
    ...HlmEmptyImports,
    HlmButton,
    HlmSkeleton,
    HlmSwitch,
    LineChart,
    OrganizationTrendChartNotice,
    StatTile,
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
      lucideBellRing,
      lucideBuilding2,
      lucideChevronRight,
      lucideCircleAlert,
      lucideCircleCheck,
      lucideCircleDotDashed,
      lucideClipboardCheck,
      lucideCloudUpload,
      lucideCompass,
      lucideEye,
      lucideLock,
      lucideMailWarning,
      lucideOctagonAlert,
      lucidePlus,
      lucideRefreshCw,
      lucideShieldCheck,
      lucideTriangleAlert,
      lucideUndo2,
      lucideWrench,
    }),
  ],
  templateUrl: './organization-dashboard-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDashboardPage {
  /** The routed organization, used to name the page and to build destinations. */
  protected readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property dashboardStore
   * @readonly
   * @description Owns the aggregate metrics, comparisons and severity breakdown.
   * @access protected
   * @since 1.0.0
   * @type {DashboardStore}
   */
  protected readonly dashboardStore: DashboardStore = inject<DashboardStore>(DashboardStore);

  /** Organization-owned helper exposing reactive permission checks. */
  private readonly permissionService: OrganizationPermissionService =
    inject<OrganizationPermissionService>(OrganizationPermissionService);

  /** Used to open an intervention or a filtered list. */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property canReadInterventions
   * @readonly
   * @description Gates the open-interventions metric using the collection read permission.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canReadInterventions: Signal<boolean> = computed((): boolean =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_READ),
  );

  /** Whether the page may offer to start an intervention. Planning is the permission the interventions list itself gates creation on. */
  protected readonly canCreateInterventions: Signal<boolean> = computed((): boolean =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN),
  );

  /**
   * * Registers {@link pageActions} on the shell header.
   */
  private readonly pageActionsService: PageActionsService = inject(PageActionsService);

  /** "New intervention", registered on the shell header instead of an in-page title band. */
  private readonly pageActions: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageActions');

  /**
   * Property kpiTiles
   * @readonly
   *
   * @description
   * The page's single, deduplicated KPI row: open interventions
   * (permission-gated), open non-conformities, completed inspections,
   * and equipment under maintenance. Every figure and its delta read
   * `DashboardStore` alone — none of them derive from the period-scoped
   * `OverviewTrendStore`/`AssetGrowthTrendStore` the Trends section's period
   * selector governs, so this row stays accurate independent of that
   * selector's position on the page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly OrganizationDashboardKpiTile[]>}
   */
  protected readonly kpiTiles: Signal<readonly OrganizationDashboardKpiTile[]> = computed(() => {
    const data = this.dashboardStore.queryData();
    const overview = data?.overview;
    const organizationId: string | null = this.organizationContext.selectedOrganizationId();
    const interventionsLink: StatTileLink | null = organizationId
      ? ['/organizations', organizationId, 'interventions']
      : null;
    const inspectionsLink: StatTileLink | null = organizationId
      ? ['/organizations', organizationId, 'inspections']
      : null;
    const equipmentsLink: StatTileLink | null = organizationId
      ? ['/organizations', organizationId, 'equipments']
      : null;
    const overdueNonConformities: number | null = getOrganizationDashboardOverviewMetricValue(
      overview,
      'nonConformities',
      'overdue',
    );
    const tiles: OrganizationDashboardKpiTile[] = [];

    if (this.canReadInterventions()) {
      tiles.push({
        id: 'open-interventions',
        label: $localize`:@@org.today.kpi.openInterventions:Open interventions`,
        value:
          getOrganizationDashboardOverviewMetricValue(overview, 'interventions', 'open') ?? '—',
        icon: 'lucideCompass',
        link: interventionsLink,
        delta: null,
        tone: 'neutral',
        badge: null,
      });
    }

    tiles.push(
      {
        id: 'open-non-conformities',
        label: $localize`:@@org.today.kpi.openNonConformities:Open non-conformities`,
        value:
          getOrganizationDashboardOverviewMetricValue(overview, 'nonConformities', 'open') ?? '—',
        icon: 'lucideTriangleAlert',
        link: inspectionsLink,
        delta: null,
        tone:
          overdueNonConformities !== null && overdueNonConformities > 0 ? 'destructive' : 'neutral',
        badge:
          overdueNonConformities !== null && overdueNonConformities > 0
            ? {
                label: $localize`:@@org.today.kpi.openNonConformities.badge.overdue:${overdueNonConformities}:count: overdue`,
                icon: 'lucideTriangleAlert',
                tone: 'destructive',
              }
            : overdueNonConformities === 0
              ? {
                  label: $localize`:@@org.today.kpi.openNonConformities.badge.onTrack:On track`,
                  icon: 'lucideCircleCheck',
                  tone: 'neutral',
                }
              : null,
      },
      {
        id: 'inspections-completed',
        label: $localize`:@@org.today.kpi.inspectionsCompleted:Inspections completed`,
        value:
          getOrganizationDashboardOverviewMetricValue(overview, 'inspections', 'closed') ?? '—',
        icon: 'lucideClipboardCheck',
        link: inspectionsLink,
        delta: this.toComparisonDelta(this.dashboardStore.inspectionsComparison(), true),
        tone: 'neutral',
        badge: null,
      },
      {
        id: 'equipment-under-maintenance',
        label: $localize`:@@org.today.kpi.equipmentUnderMaintenance:Equipment under maintenance`,
        value:
          getOrganizationDashboardOverviewMetricValue(overview, 'equipment', 'underMaintenance') ??
          '—',
        icon: 'lucideWrench',
        link: equipmentsLink,
        delta: null,
        tone: 'neutral',
        badge: null,
      },
    );

    return tiles;
  });
  //#endregion

  //#region Properties — trends
  /** Owns the combined inspections / non-conformities-opened / non-conformities-resolved trend datasets backing the Inspections and the Non-conformities opened vs resolved charts. */
  protected readonly overviewTrendStore: OverviewTrendStore =
    inject<OverviewTrendStore>(OverviewTrendStore);

  /** Owns the combined equipment-created / facilities-created trend datasets backing the Equipment added and Facilities added charts. */
  protected readonly assetGrowthTrendStore: AssetGrowthTrendStore =
    inject<AssetGrowthTrendStore>(AssetGrowthTrendStore);

  /** The active preset range. Defaults to 30 days — a window wide enough to show a trend without asking for the full year up front. */
  protected readonly selectedPeriod: WritableSignal<OrganizationDashboardTrendsPeriodPreset> =
    signal<OrganizationDashboardTrendsPeriodPreset>('30d');

  /** Whether the trend charts fetch a comparison series, feeding each chart's own "vs previous period" summary line below it. Defaults on: the comparison is what turns a bare total into a trend signal. Does not affect the KPI row above, which is not period-scoped. */
  protected readonly compareToPreviousPeriod: WritableSignal<boolean> = signal<boolean>(true);

  /** Placeholder row count shown while the severity breakdown loads. */
  protected readonly severitySkeletonRows: readonly number[] = [0, 1, 2, 3];

  /** The message a trend chart card shows in place of its plot when its backing store denies the read outright (403). */
  protected readonly forbiddenMessage: string = $localize`:@@org.statistics.forbidden:Not available with your permissions.`;

  /** The message a trend chart card shows in place of its plot when its backing store failed for any other reason. */
  protected readonly trendLoadErrorMessage: string = $localize`:@@org.statistics.trend.loadError:This chart could not be loaded.`;

  /** Shared label for the Inspections chart's card title and its single series name. */
  protected readonly inspectionsSeriesName: string = $localize`:@@org.statistics.trend.inspections.title:Inspections`;

  /**
   * @access protected
   * @since 1.0.0
   * @type {string}
   */
  protected readonly inspectionsChartLabel: string = $localize`:@@org.statistics.trend.inspections.chartLabel:Inspections performed over time`;

  /**
   * @access protected
   * @since 1.0.0
   * @type {string}
   */
  protected readonly nonConformitiesChartTitle: string = $localize`:@@org.statistics.trend.nonConformities.title:Non-conformities opened vs resolved`;

  /**
   * @access protected
   * @since 1.0.0
   * @type {string}
   */
  protected readonly nonConformitiesChartLabel: string = $localize`:@@org.statistics.trend.nonConformities.chartLabel:Non-conformities opened and resolved over time`;

  /**
   * @access protected
   * @since 1.0.0
   * @type {string}
   */
  protected readonly nonConformitiesOpenedSeriesName: string = $localize`:@@org.statistics.trend.nonConformities.seriesOpened:Opened`;

  /**
   * @access protected
   * @since 1.0.0
   * @type {string}
   */
  protected readonly nonConformitiesResolvedSeriesName: string = $localize`:@@org.statistics.trend.nonConformities.seriesResolved:Resolved`;

  /**
   * @access protected
   * @since 1.0.0
   * @type {string}
   */
  protected readonly equipmentSeriesName: string = $localize`:@@org.statistics.trend.equipment.title:Equipment added`;

  /**
   * @access protected
   * @since 1.0.0
   * @type {string}
   */
  protected readonly equipmentChartLabel: string = $localize`:@@org.statistics.trend.equipment.chartLabel:Equipment added over time`;

  /**
   * @access protected
   * @since 1.0.0
   * @type {string}
   */
  protected readonly facilitiesSeriesName: string = $localize`:@@org.statistics.trend.facilities.title:Facilities added`;

  /**
   * @access protected
   * @since 1.0.0
   * @type {string}
   */
  protected readonly facilitiesChartLabel: string = $localize`:@@org.statistics.trend.facilities.chartLabel:Facilities added over time`;

  /** The current open+unresolved non-conformity count per severity, ordered from critical to low, each paired with its registry descriptor and its share of the breakdown's own total — the proportional bar's width. */
  protected readonly severityBreakdown: Signal<readonly OrganizationDashboardSeverityEntry[]> =
    computed(() => {
      const raw = getOrganizationDashboardNonConformitySeverityBreakdown(
        this.dashboardStore.queryData()?.overview,
      );
      const total: number = raw.reduce((sum, entry) => sum + entry.count, 0);

      return raw.map((entry): OrganizationDashboardSeverityEntry => ({
        severity: entry.severity,
        count: entry.count,
        percent: total > 0 ? Math.round((entry.count / total) * 100) : 0,
        descriptor: resolveInspectionStatusTag('nonConformitySeverity', entry.severity),
      }));
    });

  /**
   * @access protected
   * @since 1.0.0
   * @type {Signal<number>}
   */
  protected readonly severityTotal: Signal<number> = computed(() =>
    this.severityBreakdown().reduce((sum, entry) => sum + entry.count, 0),
  );

  /** The severity card's subtitle: how many open, unresolved non-conformities the breakdown covers right now — a current snapshot, not scoped to the page's own period selector, since `DashboardStore` never applies it. */
  protected readonly severitySummaryLine: Signal<string> = computed(() => {
    const total: number = this.severityTotal();

    return total === 1
      ? $localize`:@@org.statistics.severity.summaryOne:1 open and unresolved`
      : $localize`:@@org.statistics.severity.summaryMany:${total}:total: open and unresolved`;
  });

  /**
   * @access protected
   * @since 1.0.0
   * @type {Signal<ChartSeries[]>}
   */
  protected readonly inspectionsChartSeries: Signal<ChartSeries[]> = computed(() =>
    mapAlignedDashboardTrendSeriesToChartSeries(this.overviewTrendStore.alignedTrendData(), [
      { name: this.inspectionsSeriesName, index: 0 },
    ]),
  );

  /**
   * @access protected
   * @since 1.0.0
   * @type {Signal<ChartSeries[]>}
   */
  protected readonly nonConformitiesChartSeries: Signal<ChartSeries[]> = computed(() =>
    mapAlignedDashboardTrendSeriesToChartSeries(this.overviewTrendStore.alignedTrendData(), [
      { name: this.nonConformitiesOpenedSeriesName, index: 1 },
      { name: this.nonConformitiesResolvedSeriesName, index: 2 },
    ]),
  );

  /**
   * @access protected
   * @since 1.0.0
   * @type {Signal<ChartSeries[]>}
   */
  protected readonly equipmentChartSeries: Signal<ChartSeries[]> = computed(() =>
    mapAlignedDashboardTrendSeriesToChartSeries(this.assetGrowthTrendStore.alignedTrendData(), [
      { name: this.equipmentSeriesName, index: 0 },
    ]),
  );

  /**
   * @access protected
   * @since 1.0.0
   * @type {Signal<ChartSeries[]>}
   */
  protected readonly facilitiesChartSeries: Signal<ChartSeries[]> = computed(() =>
    mapAlignedDashboardTrendSeriesToChartSeries(this.assetGrowthTrendStore.alignedTrendData(), [
      { name: this.facilitiesSeriesName, index: 1 },
    ]),
  );

  /**
   * @access protected
   * @since 1.0.0
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
   * @access protected
   * @since 1.0.0
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
   * @access protected
   * @since 1.0.0
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
   * @access protected
   * @since 1.0.0
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
   * @constructor
   *
   * @description
   * Activates browser-only trends on entry and wires the Trends section's period selector to both trend stores so a preset
   * or compare-toggle change refetches every trend chart in one place, and
   * registers {@link pageActions}.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    registerPageActions(this.pageActions, this.pageActionsService, inject(DestroyRef));

    effect(() => {
      this.applyPeriodToTrendStores(this.selectedPeriod(), this.compareToPreviousPeriod());
      this.overviewTrendStore.activate();
      this.assetGrowthTrendStore.activate();
    });
  }

  /**
   * Method startIntervention
   *
   * @description
   * Opens the intervention list with its creation drawer already open.
   * `?create=1` is the interventions subfeature's published contract for
   * this: it lets this page's primary action actually start the work
   * without duplicating the creation drawer here.
   *
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected startIntervention(): void {
    const organizationId: string | null = this.organizationContext.selectedOrganizationId();
    if (organizationId === null) return;

    void this.router.navigate(['/organizations', organizationId, 'interventions'], {
      queryParams: { create: '1' },
    });
  }
  //#endregion

  //#region Methods — trends
  /**
   * Method onPeriodChanged
   * @description Narrows `hlm-toggle-group`'s single/multi-select payload before writing {@link selectedPeriod}.
   * @access protected
   * @since 1.0.0
   * @param {string | readonly string[] | null | undefined} value - The toggle group's emitted value.
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
   * @description Whether a normalized store error is a 403 — the signal a chart card renders as a muted "not available with your permissions" notice rather than the generic error state.
   * @access protected
   * @since 1.0.0
   * @param {StoreError | null} error - The store's normalized query error.
   * @returns {boolean} Whether the error is a permission denial.
   */
  protected isForbidden(error: StoreError | null): boolean {
    return error?.code === 403;
  }

  /**
   * Method retryDashboard
   * @description Re-runs the aggregate dashboard query after a non-permission failure.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected retryDashboard(): void {
    this.dashboardStore.load(this.organizationContext.selectedOrganizationId() ?? undefined);
  }

  /**
   * Method retryOverviewTrend
   * @description Re-runs the Inspections / Non-conformities trend query with the currently applied filters.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected retryOverviewTrend(): void {
    this.overviewTrendStore.load(this.overviewTrendStore.loadParams());
  }

  /**
   * Method retryAssetGrowthTrend
   * @description Re-runs the Equipment / Facilities trend query with the currently applied filters.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected retryAssetGrowthTrend(): void {
    this.assetGrowthTrendStore.load(this.assetGrowthTrendStore.loadParams());
  }

  /**
   * Method toComparisonDelta
   * @description Converts one of `DashboardStore`'s `*Comparison` signals — a pre-signed string magnitude and a literal direction — into the `StatTileDelta` shape `app-stat-tile` accepts.
   * @access private
   * @since 1.0.0
   * @param {{ readonly value: string | number | null; readonly direction: string | null } | null} entry - The store's comparison delta.
   * @param {boolean} positiveIsGood - Whether `up` is the desirable direction for this metric.
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
   * Method formatTrendSummaryLine
   * @description Formats one trend card's summary line: the period total alone, or the total plus its signed percentage change when a previous-period comparison was fetched.
   * @access private
   * @since 1.0.0
   * @param {number | string | undefined} total - The trend output's `summary.total`.
   * @param {string | null | undefined} comparisonMode - The trend output's `comparison.mode`.
   * @param {number | string | undefined} delta - The trend output's `comparison.summary.delta`.
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

  /**
   * Method resolvePeriodRange
   * @description Maps one preset to a concrete `[from, to]` date range ending now and the granularity best suited to it — days for the two short ranges, weeks for the quarter, months for the year.
   * @access private
   * @since 1.0.0
   * @param {OrganizationDashboardTrendsPeriodPreset} preset - The selected preset range.
   * @returns {{ readonly range: Date[]; readonly granularity: OrganizationDashboardGranularity }} The resolved range and granularity.
   */
  private resolvePeriodRange(preset: OrganizationDashboardTrendsPeriodPreset): {
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
   * Method applyPeriodToTrendStores
   * @description Resolves one preset into a date range and granularity, then applies it — along with the compare toggle — to both trend stores. Granularity is set before the date range on each store, since the stores clamp the range to the granularity's own maximum span.
   * @access private
   * @since 1.0.0
   * @param {OrganizationDashboardTrendsPeriodPreset} preset - The selected preset range.
   * @param {boolean} compare - Whether to fetch the previous-period comparison.
   * @returns {void}
   */
  private applyPeriodToTrendStores(
    preset: OrganizationDashboardTrendsPeriodPreset,
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
  //#endregion
}
