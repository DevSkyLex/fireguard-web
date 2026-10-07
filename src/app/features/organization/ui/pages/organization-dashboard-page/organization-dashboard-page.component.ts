import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  LOCALE_ID,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBellRing,
  lucideBuilding2,
  lucideChevronRight,
  lucideChevronDown,
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
  lucideRefreshCw,
  lucideShieldCheck,
  lucideTriangleAlert,
  lucideUndo2,
  lucideWrench,
} from '@ng-icons/lucide';
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
  type OrganizationDashboardPeriod,
  type OrganizationPermissionName,
} from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  REGIONAL_FORMATTING_PORT,
  type OrganizationContextPort,
  type RegionalFormattingPort,
} from '@features/organization/ports';
import {
  AssetGrowthTrendStore,
  DashboardStore,
  OverviewTrendStore,
} from '@features/organization/state/organization-dashboard';

import {
  OrganizationParkQueues,
  OrganizationTrendChartNotice,
  StatTile,
  OrganizationDashboardRisk,
  OrganizationDashboardAlerts,
  OrganizationDashboardRecent,
  type OrganizationDashboardAlertRow,
  type StatTileBadge,
  type StatTileDelta,
  type StatTileLink,
  type StatTileTone,
} from '@features/organization/ui/components';

import {
  getOrganizationDashboardHealthValue,
  getOrganizationDashboardNonConformitySeverityBreakdown,
  getOrganizationDashboardOverviewMetricValue,
  mapAlignedDashboardTrendSeriesToChartSeries,
  parseOrganizationDashboardPeriodBoundary,
} from '@features/organization/utils';
import { LineChart, type ChartSeries } from '@shared/chart';
import { OrgDatePipe, type RegionalFormatSettings } from '@shared/regional-format';

import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmProgressImports } from '@shared/ui/progress';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmSwitch } from '@shared/ui/switch';
import { HlmLarge } from '@shared/ui/typography';
import { resolveOrganizationDashboardAlertTag } from './models/organization-dashboard-alert-tag/organization-dashboard-alert-tag.util';

import { StateIllustration } from '@shared/state-illustration';
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
 *
 * @type {OrganizationDashboardKpiTile}
 */
type OrganizationDashboardKpiTile = {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable tile key used by the KPI row to track its rendered entry.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Accessible metric name shown with the KPI value.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Formatted aggregate metric, or a placeholder when the source value is unavailable.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | number}
   */
  readonly value: string | number;

  /**
   * Property icon
   * @readonly
   *
   * @description
   * Registered icon name that identifies the metric category.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly icon: string;

  /**
   * Property link
   * @readonly
   *
   * @description
   * Permission-authorized destination for the metric, or null when none is exposed.
   *
   * @access public
   * @since unreleased
   *
   * @type {StatTileLink | null}
   */
  readonly link: StatTileLink | null;

  /**
   * Property delta
   * @readonly
   *
   * @description
   * Comparison with the previous period, omitted when the tile has no comparison value.
   *
   * @access public
   * @since unreleased
   *
   * @type {StatTileDelta | null}
   */
  readonly delta: StatTileDelta | null;

  /**
   * Property tone
   * @readonly
   *
   * @description
   * Semantic visual tone used to communicate the metric's operational state.
   *
   * @access public
   * @since unreleased
   *
   * @type {StatTileTone}
   */
  readonly tone: StatTileTone;

  /**
   * Property badge
   * @readonly
   *
   * @description
   * Optional compact status indicator associated with the metric.
   *
   * @access public
   * @since unreleased
   *
   * @type {StatTileBadge | null}
   */
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
 *
 * @type {OrganizationDashboardTrendsPeriodPreset}
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
 *
 * @type {OrganizationDashboardSeverityEntry}
 */
type OrganizationDashboardSeverityEntry = {
  /**
   * Property severity
   * @readonly
   *
   * @description
   * Non-conformity severity represented by this breakdown row.
   *
   * @access public
   * @since unreleased
   *
   * @type {NonConformitySeverity}
   */
  readonly severity: NonConformitySeverity;

  /**
   * Property count
   * @readonly
   *
   * @description
   * Number of non-conformities at the represented severity.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly count: number;

  /**
   * Property percent
   * @readonly
   *
   * @description
   * Share of the total breakdown used to size the proportional bar.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly percent: number;

  /**
   * Property descriptor
   * @readonly
   *
   * @description
   * Localized status label and icon metadata rendered for the severity.
   *
   * @access public
   * @since unreleased
   *
   * @type {InspectionStatusTagDescriptor}
   */
  readonly descriptor: InspectionStatusTagDescriptor;
};

/**
 * Type OrganizationDashboardHealthRow
 *
 * @description
 * View-model for one row of the Additional analysis section's Health card:
 * one all-status snapshot percentage, unavailable rather than a misleading
 * zero when its denominator is empty.
 *
 * @since 1.0.0
 *
 * @type {OrganizationDashboardHealthRow}
 */
type OrganizationDashboardHealthRow = {
  /**
   * Property key
   * @readonly
   *
   * @description
   * Stable metric key used to match the health row with its source value.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly key: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Localized name displayed for this health metric.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Aggregate health percentage, or null when the denominator is empty.
   *
   * @access public
   * @since unreleased
   *
   * @type {number | null}
   */
  readonly value: number | null;
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
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dashboard-page',
  imports: [
    OrganizationParkQueues,
    DecimalPipe,
    OrgDatePipe,
    OrganizationDashboardRisk,
    OrganizationDashboardAlerts,
    OrganizationDashboardRecent,
    ...HlmCollapsibleImports,
    NgIcon,
    ...HlmEmptyImports,
    StateIllustration,
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
    HlmLarge,
  ],
  providers: [
    DashboardStore,
    OverviewTrendStore,
    AssetGrowthTrendStore,
    provideIcons({
      lucideBellRing,
      lucideBuilding2,
      lucideChevronRight,
      lucideChevronDown,
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
  //#region Properties
  /**
   * Property organizationContext
   * @readonly
   *
   * @description
   * The routed organization, used to name the page and to build destinations.
   *
   * @access protected
   * @since unreleased
   *
   * @type {OrganizationContextPort}
   */
  protected readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property dashboardStore
   * @readonly
   *
   * @description
   * Owns the aggregate metrics, comparisons and severity breakdown.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {DashboardStore}
   */
  protected readonly dashboardStore: DashboardStore = inject<DashboardStore>(DashboardStore);

  /**
   * Property permissionService
   * @readonly
   *
   * @description
   * Organization-owned helper exposing reactive permission checks.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrganizationPermissionService}
   */
  private readonly permissionService: OrganizationPermissionService =
    inject<OrganizationPermissionService>(OrganizationPermissionService);

  /**
   * Property regionalFormattingPort
   * @readonly
   *
   * @description
   * The active organization's regional formatting context port.
   *
   * @access private
   * @since unreleased
   *
   * @type {RegionalFormattingPort}
   */
  private readonly regionalFormattingPort: RegionalFormattingPort =
    inject<RegionalFormattingPort>(REGIONAL_FORMATTING_PORT);

  /**
   * Property regionalFormatting
   * @readonly
   *
   * @description
   * The active organization's date pattern and timezone, read by `appOrgDate` bindings and
   * forwarded to date-rendering children.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<RegionalFormatSettings>}
   */
  protected readonly regionalFormatting: Signal<RegionalFormatSettings> =
    this.regionalFormattingPort.regionalFormatting;

  /**
   * Property canReadInterventions
   * @readonly
   *
   * @description
   * Gates the open-interventions metric using the collection read permission.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadInterventions: Signal<boolean> = computed((): boolean =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_READ),
  );

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
    const open = getOrganizationDashboardOverviewMetricValue(overview, 'nonConformities', 'open');
    const inProgress = getOrganizationDashboardOverviewMetricValue(
      overview,
      'nonConformities',
      'inProgress',
    );
    const nonConformityBadge: StatTileBadge | null =
      this.nonConformityBadgeOf(overdueNonConformities);
    const overdueInterventions: number | null = getOrganizationDashboardOverviewMetricValue(
      overview,
      'interventions',
      'overdue',
    );
    const interventionsBadge: StatTileBadge | null =
      overdueInterventions !== null && overdueInterventions > 0
        ? {
            label: $localize`:@@org.today.kpi.openInterventions.badge.overdue:${overdueInterventions}:count: overdue`,
            icon: 'lucideTriangleAlert',
            tone: 'destructive',
          }
        : null;
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
        tone: interventionsBadge ? 'destructive' : 'neutral',
        badge: interventionsBadge,
      });
    }

    tiles.push(
      {
        id: 'open-non-conformities',
        label: $localize`:@@org.dashboard.kpi.toResolve:Non-conformities to resolve`,
        value: open !== null && inProgress !== null ? open + inProgress : '—',
        icon: 'lucideTriangleAlert',
        link: this.permissionService.hasPermission(ORGANIZATION_PERMISSION.INSPECTION_READ)
          ? inspectionsLink
          : null,
        delta: null,
        tone: nonConformityBadge?.tone ?? 'neutral',
        badge: nonConformityBadge,
      },
      {
        id: 'inspections-completed',
        label: $localize`:@@org.today.kpi.inspectionsCompleted:Inspections completed`,
        value:
          getOrganizationDashboardOverviewMetricValue(overview, 'inspections', 'closed') ?? '—',
        icon: 'lucideClipboardCheck',
        link: this.permissionService.hasPermission(ORGANIZATION_PERMISSION.INSPECTION_READ)
          ? inspectionsLink
          : null,
        delta: null,
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
        link: this.permissionService.hasPermission(ORGANIZATION_PERMISSION.EQUIPMENT_READ)
          ? equipmentsLink
          : null,
        delta: null,
        tone: 'neutral',
        badge: null,
      },
    );

    return tiles;
  });
  //#endregion

  //#region Properties — trends
  /**
   * Property overviewTrendStore
   * @readonly
   *
   * @description
   * Owns the inspection and non-conformity activity trend requests.
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
   * Owns the equipment and facility growth trend requests.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {AssetGrowthTrendStore}
   */
  protected readonly assetGrowthTrendStore: AssetGrowthTrendStore =
    inject<AssetGrowthTrendStore>(AssetGrowthTrendStore);

  /**
   * Property selectedPeriod
   * @readonly
   *
   * @description
   * Active trend preset, initialized to the dashboard's 30-day default.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<OrganizationDashboardTrendsPeriodPreset>}
   */
  protected readonly selectedPeriod: WritableSignal<OrganizationDashboardTrendsPeriodPreset> =
    signal<OrganizationDashboardTrendsPeriodPreset>('30d');

  /**
   * Property compareToPreviousPeriod
   * @readonly
   *
   * @description
   * Whether activity charts request their previous-period comparison.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly compareToPreviousPeriod: WritableSignal<boolean> = signal<boolean>(true);

  /**
   * Property severitySkeletonRows
   * @readonly
   *
   * @description
   * Stable placeholder rows shown while the severity breakdown loads.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly number[]}
   */
  protected readonly severitySkeletonRows: readonly number[] = [0, 1, 2, 3];

  /**
   * Property healthSkeletonRows
   * @readonly
   *
   * @description
   * Stable placeholder rows shown while the Health card's snapshot loads, matching
   * {@link healthRows}'s fixed row count.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {readonly number[]}
   */
  protected readonly healthSkeletonRows: readonly number[] = [0, 1, 2];

  /**
   * Property forbiddenMessage
   * @readonly
   *
   * @description
   * Permission-specific chart error shown for a denied trend request.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly forbiddenMessage: string = $localize`:@@org.statistics.forbidden:Not available with your permissions.`;

  /**
   * Property trendLoadErrorMessage
   * @readonly
   *
   * @description
   * Generic chart error shown when a trend request fails.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly trendLoadErrorMessage: string = $localize`:@@org.statistics.trend.loadError:This chart could not be loaded.`;

  /**
   * Property inspectionsSeriesName
   * @readonly
   *
   * @description
   * Localized label shared by the inspection card and series.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly inspectionsSeriesName: string = $localize`:@@org.dashboard.inspections.title:Inspections performed`;

  /**
   * Property inspectionsChartLabel
   * @readonly
   *
   * @description
   * Accessible label for the inspection activity chart.
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
   * @description
   * Visible title for the opened-versus-resolved chart.
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
   * @description
   * Accessible label for the opened-versus-resolved chart.
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
   * @description
   * Localized name for the opened non-conformity series.
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
   * @description
   * Localized name for the resolved non-conformity series.
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
   * @description
   * Localized name for the equipment growth series.
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
   * @description
   * Accessible label for the equipment growth chart.
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
   * @description
   * Localized name for the facility growth series.
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
   * @description
   * Accessible label for the facility growth chart.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly facilitiesChartLabel: string = $localize`:@@org.statistics.trend.facilities.chartLabel:Facilities added over time`;

  /**
   * Property severityBreakdown
   * @readonly
   *
   * @description
   * All-status non-conformity counts from critical to low, paired with their
   * registry descriptor and their share of the breakdown total.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly OrganizationDashboardSeverityEntry[]>}
   */
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
   * Property severityTotal
   * @readonly
   *
   * @description
   * Total count represented by the available all-status severity breakdown.
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
   * Summarizes the current all-status severity snapshot independently of the
   * activity period selector.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly severitySummaryLine: Signal<string | null> = computed(() => {
    if (!this.severityAvailable()) return null;
    const total = new Intl.NumberFormat(this.locale).format(this.severityTotal());

    return this.severityTotal() === 1
      ? $localize`:@@org.dashboard.severity.summaryOne:1 recorded, across all statuses`
      : $localize`:@@org.dashboard.severity.summaryMany:${total}:total: recorded, across all statuses`;
  });

  /**
   * Property healthRows
   * @readonly
   *
   * @description
   * The Additional analysis section's Health card: the current-snapshot
   * inspection pass rate, equipment availability and non-conformity
   * resolution rate, each `null` when its own denominator is empty rather
   * than showing a misleading 0%.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<readonly OrganizationDashboardHealthRow[]>}
   */
  protected readonly healthRows: Signal<readonly OrganizationDashboardHealthRow[]> = computed(
    () => {
      const data = this.dashboardStore.queryData();
      const overview = data?.overview;
      const health = data?.health;

      const inspectionsPass = getOrganizationDashboardOverviewMetricValue(
        overview,
        'inspections',
        'pass',
      );
      const inspectionsFail = getOrganizationDashboardOverviewMetricValue(
        overview,
        'inspections',
        'fail',
      );
      const inspectionsPartial = getOrganizationDashboardOverviewMetricValue(
        overview,
        'inspections',
        'partial',
      );
      const inspectionsDenominator =
        (inspectionsPass ?? 0) + (inspectionsFail ?? 0) + (inspectionsPartial ?? 0);

      const equipmentTotal = getOrganizationDashboardOverviewMetricValue(
        overview,
        'equipment',
        'total',
      );
      const equipmentDecommissioned = getOrganizationDashboardOverviewMetricValue(
        overview,
        'equipment',
        'decommissioned',
      );
      const equipmentDenominator =
        equipmentTotal !== null ? equipmentTotal - (equipmentDecommissioned ?? 0) : 0;

      const nonConformityTotal =
        getOrganizationDashboardOverviewMetricValue(overview, 'nonConformities', 'total') ?? 0;

      return [
        {
          key: 'inspectionPassRate',
          label: $localize`:@@org.dashboard.health.inspectionPassRate:Inspection pass rate`,
          value:
            inspectionsDenominator > 0
              ? getOrganizationDashboardHealthValue(health, 'inspectionPassRate')
              : null,
        },
        {
          key: 'equipmentAvailabilityRate',
          label: $localize`:@@org.dashboard.health.equipmentAvailabilityRate:Equipment availability`,
          value:
            equipmentDenominator > 0
              ? getOrganizationDashboardHealthValue(health, 'equipmentAvailabilityRate')
              : null,
        },
        {
          key: 'nonConformityResolutionRate',
          label: $localize`:@@org.dashboard.health.nonConformityResolutionRate:Non-conformity resolution rate`,
          value:
            nonConformityTotal > 0
              ? getOrganizationDashboardHealthValue(health, 'nonConformityResolutionRate')
              : null,
        },
      ];
    },
  );

  /**
   * Property inspectionsChartSeries
   * @readonly
   *
   * @description
   * Period-scoped inspection volume series with the semantic primary color.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ChartSeries[]>}
   */
  protected readonly inspectionsChartSeries: Signal<ChartSeries[]> = computed(() =>
    mapAlignedDashboardTrendSeriesToChartSeries(this.overviewTrendStore.alignedTrendData(), [
      { name: this.inspectionsSeriesName, index: 0 },
    ]).map((series) => ({
      name: series.name,
      points: series.points,
      colorToken: 'primary' as const,
    })),
  );

  /**
   * Property nonConformitiesChartSeries
   * @readonly
   *
   * @description
   * Period-scoped opened and resolved non-conformity series.
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
    ]).map((series, index) => ({
      name: series.name,
      points: series.points,
      colorToken: index === 0 ? ('warning' as const) : ('success' as const),
    })),
  );

  /**
   * Property equipmentChartSeries
   * @readonly
   *
   * @description
   * Period-scoped equipment growth series for additional analysis.
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
   * @description
   * Period-scoped facility growth series for additional analysis.
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
   * Property nonConformitiesSummaryLine
   * @readonly
   *
   * @description
   * Localized opened and resolved totals for the loaded activity period.
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

    if (
      typeof openedTotal !== 'number' ||
      typeof resolvedTotal !== 'number' ||
      !Number.isFinite(openedTotal) ||
      !Number.isFinite(resolvedTotal)
    )
      return null;

    const formatter = new Intl.NumberFormat(this.locale);
    return $localize`:@@org.statistics.trend.nonConformitiesSummary:${formatter.format(openedTotal)}:opened: opened, ${formatter.format(resolvedTotal)}:resolved: resolved this period`;
  });

  /**
   * Property equipmentSummaryLine
   * @readonly
   *
   * @description
   * Localized equipment total and comparison for the loaded activity period.
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
      output?.comparison?.summary?.['total'],
    );
  });

  /**
   * Property facilitiesSummaryLine
   * @readonly
   *
   * @description
   * Localized facility total and comparison for the loaded activity period.
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
      output?.comparison?.summary?.['total'],
    );
  });
  //#endregion

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Active application locale.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private readonly locale: string = inject(LOCALE_ID);

  /**
   * Property aggregateLoading
   * @readonly
   *
   * @description
   * Reserve skeletons only before the first successful aggregate.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly aggregateLoading: Signal<boolean> = computed(
    () => this.dashboardStore.isQueryLoading() && !this.dashboardStore.queryData(),
  );

  /**
   * Property alertRows
   * @readonly
   *
   * @description
   * Permission-checked presentation rows without summing overlapping alerts.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly OrganizationDashboardAlertRow[] | null>}
   */
  protected readonly alertRows: Signal<readonly OrganizationDashboardAlertRow[] | null> = computed(
    () => {
      const data = this.dashboardStore.queryData();
      const organizationId = this.organizationContext.selectedOrganizationId();
      if (!data || !Array.isArray(data.alerts)) return null;
      const order = [
        'critical_non_conformities_open',
        'non_conformities_overdue',
        'equipment_under_maintenance',
        'expired_invitations',
      ];
      return data.alerts
        .toSorted((a, b) => {
          const rank = (code: string) => {
            const index = order.indexOf(code);
            return index < 0 ? order.length : index;
          };
          return rank(a.code ?? '') - rank(b.code ?? '');
        })
        .map((alert, index): OrganizationDashboardAlertRow => {
          const code = alert.code ?? '';
          const descriptor = resolveOrganizationDashboardAlertTag(code);
          let permission: OrganizationPermissionName = ORGANIZATION_PERMISSION.INSPECTION_READ;
          let target = 'inspections';
          if (code === 'equipment_under_maintenance') {
            permission = ORGANIZATION_PERMISSION.EQUIPMENT_READ;
            target = 'equipments';
          } else if (code === 'expired_invitations') {
            permission = ORGANIZATION_PERMISSION.MEMBERS_MANAGE;
            target = 'members';
          }
          let colorToken: OrganizationDashboardAlertRow['colorToken'] = 'muted-foreground';
          if (descriptor.severity === 'danger') colorToken = 'destructive';
          else if (descriptor.severity === 'warning') colorToken = 'warning';
          return {
            id: code + '-' + index,
            label:
              descriptor.label || $localize`:@@org.dashboard.attention.unknown:Unrecognized alert`,
            icon: descriptor.icon,
            colorToken,
            count:
              typeof alert.count === 'number' && Number.isFinite(alert.count) && alert.count >= 0
                ? alert.count
                : null,
            destination:
              organizationId &&
              order.includes(code) &&
              this.permissionService.hasPermission(permission)
                ? ['/organizations', organizationId, target]
                : null,
          };
        });
    },
  );

  /**
   * Property severityAvailable
   * @readonly
   *
   * @description
   * Missing severity data is distinct from zero recorded issues.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly severityAvailable: Signal<boolean> = computed(() =>
    ['severityCritical', 'severityHigh', 'severityMedium', 'severityLow'].every(
      (key) =>
        getOrganizationDashboardOverviewMetricValue(
          this.dashboardStore.queryData()?.overview,
          'nonConformities',
          key,
        ) !== null,
    ),
  );

  /**
   * Property inspectionsTotal
   * @readonly
   *
   * @description
   * Performed inspection count for the loaded period, not the closed-inspection snapshot.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number | null>}
   */
  protected readonly inspectionsTotal: Signal<number | null> = computed(() => {
    const value = this.overviewTrendStore.queryData()?.inspections?.summary?.['total'];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  });

  /**
   * Property inspectionsDeltaLine
   * @readonly
   *
   * @description
   * Comparison only when its denominator and delta are meaningful.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly inspectionsDeltaLine: Signal<string | null> = computed(() => {
    const comparison = this.overviewTrendStore.queryData()?.inspections?.comparison;
    if (comparison?.mode !== 'previous_period') return null;
    const previous = comparison.summary?.['total'];
    const delta = comparison.summary?.['delta'];
    if (
      typeof previous !== 'number' ||
      !Number.isFinite(previous) ||
      previous <= 0 ||
      typeof delta !== 'number' ||
      !Number.isFinite(delta)
    )
      return $localize`:@@org.dashboard.comparison.noBaseline:No previous-period baseline`;
    const value = new Intl.NumberFormat(this.locale, {
      maximumFractionDigits: 1,
      signDisplay: 'exceptZero',
    }).format(delta);
    return $localize`:@@org.dashboard.comparison.delta:${value}:value:% vs previous period`;
  });

  /**
   * Method formatLoadedPeriod
   * @method formatLoadedPeriod
   *
   * @description
   * Labels the period returned with the displayed data, including during a refresh.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OrganizationDashboardPeriod | undefined} period - Loaded API period.
   *
   * @returns {string} Localized range, or no fabricated date when absent.
   */
  protected formatLoadedPeriod(period: OrganizationDashboardPeriod | undefined): string {
    if (!period?.from || !period.to) return '';
    const from: Date = parseOrganizationDashboardPeriodBoundary(period.from);
    const to: Date = parseOrganizationDashboardPeriodBoundary(period.to);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from > to) return '';
    return new Intl.DateTimeFormat(this.locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).formatRange(from, to);
  }

  //#region Lifecycle
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Activates browser-only trends on entry and wires the Trends section's period selector to both
   * trend stores so a preset or compare-toggle change refetches every trend chart in one place.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect(() => {
      this.applyPeriodToTrendStores(this.selectedPeriod(), this.compareToPreviousPeriod());
      this.overviewTrendStore.activate();
      this.assetGrowthTrendStore.activate();
    });
  }

  //#endregion

  //#region Methods — trends
  /**
   * Method onPeriodChanged
   * @method onPeriodChanged
   *
   * @description
   * Narrows `hlm-toggle-group`'s single/multi-select payload before writing {@link selectedPeriod}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | readonly string[] | null | undefined} value - The toggle group's emitted
   *   value.
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
   * Whether a normalized store error is a 403 — the signal a chart card renders as a muted "not
   * available with your permissions" notice rather than the generic error state.
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
   * Re-runs the Inspections / Non-conformities trend query with the currently applied filters.
   *
   * @access protected
   * @since 1.0.0
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
   * Re-runs the Equipment / Facilities trend query with the currently applied filters.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected retryAssetGrowthTrend(): void {
    this.assetGrowthTrendStore.load(this.assetGrowthTrendStore.loadParams());
  }

  /**
   * Method formatTrendSummaryLine
   * @method formatTrendSummaryLine
   *
   * @description
   * Formats one trend card's summary line: the period total alone, or the total plus its signed
   * percentage change when a previous-period comparison was fetched.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {number | string | undefined} total - The trend output's `summary.total`.
   * @param {string | null | undefined} comparisonMode - The trend output's `comparison.mode`.
   * @param {number | string | undefined} delta - The trend output's `comparison.summary.delta`.
   * @param {number | undefined} previousTotal - Prior period denominator; zero has no relative
   *   change.
   *
   * @returns {string | null} The formatted line, or `null` when no total is available.
   */
  private formatTrendSummaryLine(
    total: number | string | undefined,
    comparisonMode: string | null | undefined,
    delta: number | string | undefined,
    previousTotal: number | undefined,
  ): string | null {
    if (typeof total !== 'number' || !Number.isFinite(total)) return null;

    const formattedTotal = new Intl.NumberFormat(this.locale).format(total);
    if (
      comparisonMode !== 'previous_period' ||
      typeof delta !== 'number' ||
      !Number.isFinite(delta) ||
      typeof previousTotal !== 'number' ||
      !Number.isFinite(previousTotal) ||
      previousTotal <= 0
    ) {
      return $localize`:@@org.statistics.trend.summary:${formattedTotal}:total: total this period`;
    }

    const formattedDelta = new Intl.NumberFormat(this.locale, {
      maximumFractionDigits: 1,
      signDisplay: 'exceptZero',
    }).format(delta);

    return $localize`:@@org.statistics.trend.summaryWithDelta:${formattedTotal}:total: total this period, ${formattedDelta}:delta:% vs previous period`;
  }

  /**
   * Method nonConformityBadgeOf
   * @method nonConformityBadgeOf
   *
   * @description
   * Describes a known overdue count without treating missing data as an on-track result.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {number | null} overdue - The authoritative overdue count, or null when unavailable.
   *
   * @returns {StatTileBadge | null} The overdue or on-track badge, or null for an unknown count.
   */
  private nonConformityBadgeOf(overdue: number | null): StatTileBadge | null {
    if (overdue !== null && overdue > 0) {
      return {
        label: $localize`:@@org.today.kpi.openNonConformities.badge.overdue:${overdue}:count: overdue`,
        icon: 'lucideTriangleAlert',
        tone: 'destructive',
      };
    }
    if (overdue === 0) {
      return {
        label: $localize`:@@org.today.kpi.openNonConformities.badge.onTrack:On track`,
        icon: 'lucideCircleCheck',
        tone: 'neutral',
      };
    }
    return null;
  }

  /**
   * Method resolvePeriodRange
   * @method resolvePeriodRange
   *
   * @description
   * Maps one preset to a concrete `[from, to]` date range ending now and the granularity best
   * suited to it — days for the two short ranges, weeks for the quarter, months for the year.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {OrganizationDashboardTrendsPeriodPreset} preset - The selected preset range.
   *
   * @returns {{ readonly range: Date[]; readonly granularity: OrganizationDashboardGranularity }}
   *   The resolved range and granularity.
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
   * @method applyPeriodToTrendStores
   *
   * @description
   * Resolves one preset into a date range and granularity, then applies it — along with the compare
   * toggle — to both trend stores. Granularity is set before the date range on each store, since
   * the stores clamp the range to the granularity's own maximum span.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {OrganizationDashboardTrendsPeriodPreset} preset - The selected preset range.
   * @param {boolean} compare - Whether to fetch the previous-period comparison.
   *
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
