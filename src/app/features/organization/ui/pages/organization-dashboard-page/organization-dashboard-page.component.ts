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
import { Router, RouterLink } from '@angular/router';
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
import type {
  InterventionOutput,
  InterventionUnsyncedEntry,
} from '@features/organization/features/interventions/models';
import { InterventionTag } from '@features/organization/features/interventions/ui/components';
import {
  ORGANIZATION_PERMISSION,
  type OrganizationDashboardGranularity,
  type OrganizationDashboardRecentIntervention,
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
import { OrganizationTodayStore } from '@features/organization/state/organization-today';
import {
  OrganizationTodayQueue,
  OrganizationTrendChartNotice,
  StatTile,
  type StatTileBadge,
  type StatTileDelta,
  type StatTileDeltaDirection,
  type StatTileLink,
  type StatTileTone,
} from '@features/organization/ui/components';
import { OrganizationAvatar } from '@features/organization/ui/components';
import {
  getOrganizationDashboardHealthComparisonDelta,
  getOrganizationDashboardHealthValue,
  getOrganizationDashboardNonConformitySeverityBreakdown,
  getOrganizationDashboardOverviewMetricValue,
  getOrganizationInitials,
  mapAlignedDashboardTrendSeriesToChartSeries,
} from '@features/organization/utils';
import { LineChart, type ChartSeries } from '@shared/chart';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { OrgDatePipe, type RegionalFormatSettings } from '@shared/regional-format';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmAvatar, HlmAvatarFallback, HlmAvatarImage } from '@shared/ui/avatar';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmProgressImports } from '@shared/ui/progress';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmSwitch } from '@shared/ui/switch';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';
import { ORGANIZATION_DASHBOARD_ALERT_TAG_ICON_CLASS } from './constants/organization-dashboard-alert-tag-icon-class.constants';
import { resolveOrganizationDashboardAlertTag } from './models';

/**
 * Type OrganizationDashboardKpiTile
 *
 * @description
 * View-model for one cell of the page's single KPI row, which folds the
 * retired Today and Statistics tabs' two rows into one deduplicated strip.
 * Every value reads from `DashboardStore`'s own aggregate payload, never from
 * the period-scoped `OverviewTrendStore`/`AssetGrowthTrendStore` — so every
 * cell's number and delta hold regardless of the Trends section's period
 * selector below it. `tone` is `destructive` only for `open-non-conformities`
 * when the overview also reports an overdue count above zero — every other
 * cell stays neutral, and severity is always paired with the tile's
 * {@link icon} rather than carried by colour alone. `badge` states that same
 * overdue count, or "On track" once it reaches zero. `caption` and
 * `description` fill the tile's footer zone with a stable fact about what the
 * number means, the same footer treatment `InterventionKpiTile` uses — never
 * a fabricated trend.
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
  readonly caption: string;
  readonly description: string;
};

/**
 * Type OrganizationDashboardAlertRow
 *
 * @description
 * View-model for one row of the dashboard's backend-computed alert feed.
 * `link` is `null` when the code names nothing this app can navigate to yet,
 * which keeps the row a plain sentence instead of a dead link.
 *
 * @since 1.0.0
 */
type OrganizationDashboardAlertRow = {
  readonly code: string;
  readonly message: string;
  readonly icon: string;
  readonly iconClass: string;
  readonly link: StatTileLink | null;
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
 * The organization's landing route, merging the retired Today and Statistics
 * pages into one continuous scroll (`ARCHITECTURE.md` §8.3): an identity row,
 * a single deduplicated KPI strip, the work queues, the backend's alert feed
 * and "Recently updated" interventions, then a Trends section — its own
 * period preset / compare-to-previous-period controls, a non-conformity
 * severity breakdown and four trend charts. Every KPI tile reads the
 * component-scoped `DashboardStore` copy of the aggregate `/dashboard`
 * payload, never the period-scoped trend stores, so the strip's numbers hold
 * regardless of the Trends section's period selector below it.
 *
 * The page owns all orchestration: it holds every store, resolves
 * permissions, localizes rows and performs navigation; its children only
 * render (`ARCHITECTURE.md` §10.1). `OverviewTrendStore` and
 * `AssetGrowthTrendStore` load unconditionally on mount — correct now that
 * the trend charts always render on this single page, unlike the retired
 * tabbed layout where the same unconditional load fetched data behind a tab
 * a visitor might never open.
 *
 * The page's title is now the shell's own `DashboardPageHeader`, sourced
 * from the route's `title`; this page renders no title band of its own.
 * `app-organization-page-header` is retired — the org identity it used to
 * carry (avatar, plan, status, member count) is still shown nowhere else, so
 * it stays as a page-local lead row above the KPI strip, built from the same
 * `organizationContext` this page already reads. The header actions
 * template, registered on the shell through `PageActionsService`, carries
 * only "New intervention": the period toggle and compare switch sit in the
 * Trends section's own header instead, next to the charts they actually
 * govern.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dashboard-page',
  imports: [
    OrgDatePipe,
    NgIcon,
    RouterLink,
    EmptyState,
    ErrorState,
    HlmAvatar,
    HlmAvatarFallback,
    HlmAvatarImage,
    HlmBadge,
    HlmButton,
    HlmSkeleton,
    OrganizationAvatar,
    HlmSwitch,
    InterventionTag,
    LineChart,
    OrganizationTodayQueue,
    OrganizationTrendChartNotice,
    StatTile,
    ...HlmAlertImports,
    ...HlmCardImports,
    ...HlmFieldImports,
    ...HlmProgressImports,
    ...HlmToggleGroupImports,
  ],
  providers: [
    DashboardStore,
    OrganizationTodayStore,
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
  //#region Properties — shared
  /** The active organization's regional formatting context port. */
  private readonly regionalFormattingPort: RegionalFormattingPort =
    inject<RegionalFormattingPort>(REGIONAL_FORMATTING_PORT);

  /**
   * Property regionalFormatting
   * @readonly
   * @description The active organization's date pattern and timezone, read by `appOrgDate` bindings and forwarded to date-rendering children.
   * @access protected
   * @since 1.0.0
   * @type {Signal<RegionalFormatSettings>}
   */
  protected readonly regionalFormatting: Signal<RegionalFormatSettings> =
    this.regionalFormattingPort.regionalFormatting;

  /** The routed organization, used to name the page and to build destinations. */
  protected readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /** The identity row's avatar fallback, empty until the organization resolves. */
  protected readonly organizationInitials: Signal<string> = computed((): string => {
    const organization = this.organizationContext.selectedOrganization();

    return organization ? getOrganizationInitials(organization.name) : '';
  });

  /** The identity row's status badge, shown only when the organization is resolved and its status is not the desirable `active` one. */
  protected readonly organizationStatusLabel: Signal<string | null> = computed(
    (): string | null => {
      const status = this.organizationContext.selectedOrganization()?.status;

      if (!status || status === 'active') return null;

      return status.replace(/_/g, ' ');
    },
  );

  /** The identity row's muted "N member(s)" line, `null` before the organization resolves. */
  protected readonly organizationMemberCountLabel: Signal<string | null> = computed(
    (): string | null => {
      const count = this.organizationContext.selectedOrganization()?.memberCount;

      if (count === null || count === undefined) return null;
      if (count === 1) return $localize`:@@org.dashboard.memberCountOne:1 member`;

      return $localize`:@@org.dashboard.memberCountMany:${count}:count: members`;
    },
  );

  /** Owns the aggregate `/dashboard` payload the whole page reads from: overview counts, health rates, the alert feed, the recent-interventions list and the previous-period comparison. */
  protected readonly dashboardStore: DashboardStore = inject<DashboardStore>(DashboardStore);

  /** Organization-owned helper exposing reactive permission checks. */
  private readonly permissionService: OrganizationPermissionService =
    inject<OrganizationPermissionService>(OrganizationPermissionService);

  /** Used to open an intervention or a filtered list. */
  private readonly router: Router = inject<Router>(Router);

  /** Whether the caller may read interventions — gates the queues, the "open interventions" KPI tile and the recent interventions list, all sourced from that collection. */
  protected readonly canReadInterventions: Signal<boolean> = computed((): boolean =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_READ),
  );

  /** Whether the page may offer to start an intervention. Planning is the permission the interventions list itself gates creation on. */
  protected readonly canCreateInterventions: Signal<boolean> = computed((): boolean =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN),
  );

  /** Registers {@link pageActions} on the shell header. */
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
   * equipment under maintenance, registered facilities, tracked equipment
   * and the non-conformity resolution rate. Every figure and its delta read
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
    const health = data?.health;
    const comparison = data?.comparison;
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
    const facilitiesLink: StatTileLink | null = organizationId
      ? ['/organizations', organizationId, 'facilities']
      : null;
    const overdueNonConformities: number | null = getOrganizationDashboardOverviewMetricValue(
      overview,
      'nonConformities',
      'overdue',
    );
    const resolutionRate: number | null = getOrganizationDashboardHealthValue(
      health,
      'nonConformityResolutionRate',
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
        caption: $localize`:@@org.today.kpi.openInterventions.caption:Currently open`,
        description: $localize`:@@org.today.kpi.openInterventions.context:Planned, in progress, or sent back for changes`,
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
        caption:
          overdueNonConformities !== null && overdueNonConformities > 0
            ? $localize`:@@org.today.kpi.openNonConformities.caption.pastDue:Past due date`
            : overdueNonConformities === 0
              ? $localize`:@@org.today.kpi.openNonConformities.caption.none:Nothing overdue`
              : $localize`:@@org.today.kpi.openNonConformities.caption.default:Open findings`,
        description: $localize`:@@org.today.kpi.openNonConformities.context:From inspections, not yet resolved`,
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
        caption: $localize`:@@org.today.kpi.inspectionsCompleted.caption:Finished this period`,
        description: $localize`:@@org.today.kpi.inspectionsCompleted.context:Closed inspections compared to the previous period`,
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
        caption: $localize`:@@org.today.kpi.equipmentUnderMaintenance.caption:Out of service`,
        description: $localize`:@@org.today.kpi.equipmentUnderMaintenance.context:Equipment currently flagged for maintenance`,
      },
      {
        id: 'facilities',
        label: $localize`:@@org.statistics.kpi.facilities:Facilities`,
        value: this.dashboardStore.facilityCount() ?? '—',
        caption: $localize`:@@org.statistics.kpi.facilities.caption:Registered facilities`,
        description: $localize`:@@org.statistics.kpi.facilities.context:Sites currently tracked across your organization`,
        icon: 'lucideBuilding2',
        delta: this.toComparisonDelta(this.dashboardStore.facilitiesComparison(), true),
        link: facilitiesLink,
        tone: 'neutral',
        badge: null,
      },
      {
        id: 'equipment',
        label: $localize`:@@org.statistics.kpi.equipment:Equipment`,
        value: this.dashboardStore.equipmentCount() ?? '—',
        caption: $localize`:@@org.statistics.kpi.equipment.caption:Tracked equipment`,
        description: $localize`:@@org.statistics.kpi.equipment.context:Assets currently registered across your facilities`,
        icon: 'lucideWrench',
        delta: this.toComparisonDelta(this.dashboardStore.equipmentComparison(), true),
        link: equipmentsLink,
        tone: 'neutral',
        badge: null,
      },
      {
        id: 'resolution-rate',
        label: $localize`:@@org.statistics.kpi.resolutionRate:Non-conformity resolution rate`,
        value: resolutionRate !== null ? `${Math.round(resolutionRate)}%` : '—',
        caption: $localize`:@@org.statistics.kpi.resolutionRate.caption:Resolution rate`,
        description: $localize`:@@org.statistics.kpi.resolutionRate.context:Share of non-conformities resolved this period`,
        icon: 'lucideShieldCheck',
        tone: 'neutral',
        badge: null,
        delta: this.toHealthComparisonDelta(
          getOrganizationDashboardHealthComparisonDelta(comparison, 'nonConformityResolutionRate'),
          true,
        ),
        link: null,
      },
    );

    return tiles;
  });
  //#endregion

  //#region Properties — work queues and alerts
  /** Component-scoped store owning the work queues, network and local alike. */
  protected readonly store: OrganizationTodayStore =
    inject<OrganizationTodayStore>(OrganizationTodayStore);

  /** The severity-to-colour map for the alert strip's icons. */
  protected readonly alertIconClass: typeof ORGANIZATION_DASHBOARD_ALERT_TAG_ICON_CLASS =
    ORGANIZATION_DASHBOARD_ALERT_TAG_ICON_CLASS;

  /** Interventions still holding queued local operations, flattened to the shape the queue component renders. */
  protected readonly unsynced: Signal<readonly InterventionOutput[]> = computed(
    (): readonly InterventionOutput[] =>
      this.store
        .unsynced()
        .map((entry: InterventionUnsyncedEntry): InterventionOutput => entry.intervention),
  );

  /** Secondary line of the unsynced queue: how many local changes are queued. */
  protected readonly unsyncedNotes: Signal<Readonly<Record<string, string>>> = computed(
    (): Readonly<Record<string, string>> => {
      const notes: Record<string, string> = {};

      for (const entry of this.store.unsynced()) {
        notes[entry.intervention.id] =
          $localize`:@@org.today.pendingChanges:${entry.pendingCount}:count: changes waiting to sync`;
      }

      return notes;
    },
  );

  /** The nearest planned intervention still ahead, shown once nothing is waiting so the all-clear points somewhere. */
  protected readonly nextUpcoming: Signal<InterventionOutput | undefined> = computed(
    (): InterventionOutput | undefined => this.store.upcoming().items[0],
  );

  /**
   * Property alertRows
   * @readonly
   *
   * @description
   * The dashboard's backend-computed alert feed, resolved through the page's
   * alert-code registry into a localized, count-aware sentence per row.
   * Severity is never carried by colour alone: the icon and its tint are
   * paired with the label in the same sentence.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly OrganizationDashboardAlertRow[]>}
   */
  protected readonly alertRows: Signal<readonly OrganizationDashboardAlertRow[]> = computed(
    (): readonly OrganizationDashboardAlertRow[] => {
      const organizationId: string | null = this.organizationContext.selectedOrganizationId();

      return this.dashboardStore.alerts().map((alert): OrganizationDashboardAlertRow => {
        const code: string = typeof alert.code === 'string' ? alert.code : '';
        const count: number = typeof alert.count === 'number' ? alert.count : 0;
        const descriptor = resolveOrganizationDashboardAlertTag(code);

        return {
          code,
          icon: descriptor.icon,
          iconClass: this.alertIconClass[descriptor.severity],
          message: this.formatAlertMessage(code, count, descriptor.label),
          link: this.alertLinkFor(code, organizationId),
        };
      });
    },
  );

  /** The dashboard's most recently updated interventions, empty while the caller lacks {@link canReadInterventions} — the backend omits the field entirely in that case. */
  protected readonly recentInterventions: Signal<
    readonly OrganizationDashboardRecentIntervention[]
  > = computed((): readonly OrganizationDashboardRecentIntervention[] =>
    this.dashboardStore.recentInterventions(),
  );
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

  /** @access protected @since 1.0.0 @type {string} */
  protected readonly inspectionsChartLabel: string = $localize`:@@org.statistics.trend.inspections.chartLabel:Inspections performed over time`;

  /** @access protected @since 1.0.0 @type {string} */
  protected readonly nonConformitiesChartTitle: string = $localize`:@@org.statistics.trend.nonConformities.title:Non-conformities opened vs resolved`;

  /** @access protected @since 1.0.0 @type {string} */
  protected readonly nonConformitiesChartLabel: string = $localize`:@@org.statistics.trend.nonConformities.chartLabel:Non-conformities opened and resolved over time`;

  /** @access protected @since 1.0.0 @type {string} */
  protected readonly nonConformitiesOpenedSeriesName: string = $localize`:@@org.statistics.trend.nonConformities.seriesOpened:Opened`;

  /** @access protected @since 1.0.0 @type {string} */
  protected readonly nonConformitiesResolvedSeriesName: string = $localize`:@@org.statistics.trend.nonConformities.seriesResolved:Resolved`;

  /** @access protected @since 1.0.0 @type {string} */
  protected readonly equipmentSeriesName: string = $localize`:@@org.statistics.trend.equipment.title:Equipment added`;

  /** @access protected @since 1.0.0 @type {string} */
  protected readonly equipmentChartLabel: string = $localize`:@@org.statistics.trend.equipment.chartLabel:Equipment added over time`;

  /** @access protected @since 1.0.0 @type {string} */
  protected readonly facilitiesSeriesName: string = $localize`:@@org.statistics.trend.facilities.title:Facilities added`;

  /** @access protected @since 1.0.0 @type {string} */
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

  /** @access protected @since 1.0.0 @type {Signal<number>} */
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

  /** @access protected @since 1.0.0 @type {Signal<ChartSeries[]>} */
  protected readonly inspectionsChartSeries: Signal<ChartSeries[]> = computed(() =>
    mapAlignedDashboardTrendSeriesToChartSeries(this.overviewTrendStore.alignedTrendData(), [
      { name: this.inspectionsSeriesName, index: 0 },
    ]),
  );

  /** @access protected @since 1.0.0 @type {Signal<ChartSeries[]>} */
  protected readonly nonConformitiesChartSeries: Signal<ChartSeries[]> = computed(() =>
    mapAlignedDashboardTrendSeriesToChartSeries(this.overviewTrendStore.alignedTrendData(), [
      { name: this.nonConformitiesOpenedSeriesName, index: 1 },
      { name: this.nonConformitiesResolvedSeriesName, index: 2 },
    ]),
  );

  /** @access protected @since 1.0.0 @type {Signal<ChartSeries[]>} */
  protected readonly equipmentChartSeries: Signal<ChartSeries[]> = computed(() =>
    mapAlignedDashboardTrendSeriesToChartSeries(this.assetGrowthTrendStore.alignedTrendData(), [
      { name: this.equipmentSeriesName, index: 0 },
    ]),
  );

  /** @access protected @since 1.0.0 @type {Signal<ChartSeries[]>} */
  protected readonly facilitiesChartSeries: Signal<ChartSeries[]> = computed(() =>
    mapAlignedDashboardTrendSeriesToChartSeries(this.assetGrowthTrendStore.alignedTrendData(), [
      { name: this.facilitiesSeriesName, index: 1 },
    ]),
  );

  /** @access protected @since 1.0.0 @type {Signal<string | null>} */
  protected readonly inspectionsSummaryLine: Signal<string | null> = computed(() => {
    const output = this.overviewTrendStore.queryData()?.inspections;

    return this.formatTrendSummaryLine(
      output?.summary?.['total'],
      output?.comparison?.mode,
      output?.comparison?.summary?.['delta'],
    );
  });

  /** @access protected @since 1.0.0 @type {Signal<string | null>} */
  protected readonly nonConformitiesSummaryLine: Signal<string | null> = computed(() => {
    const data = this.overviewTrendStore.queryData();
    const openedTotal = data?.ncOpened?.summary?.['total'];
    const resolvedTotal = data?.ncResolved?.summary?.['total'];

    if (typeof openedTotal !== 'number' || typeof resolvedTotal !== 'number') return null;

    return $localize`:@@org.statistics.trend.nonConformitiesSummary:${openedTotal}:opened: opened, ${resolvedTotal}:resolved: resolved this period`;
  });

  /** @access protected @since 1.0.0 @type {Signal<string | null>} */
  protected readonly equipmentSummaryLine: Signal<string | null> = computed(() => {
    const output = this.assetGrowthTrendStore.queryData()?.equipment;

    return this.formatTrendSummaryLine(
      output?.summary?.['total'],
      output?.comparison?.mode,
      output?.comparison?.summary?.['delta'],
    );
  });

  /** @access protected @since 1.0.0 @type {Signal<string | null>} */
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
   * Wires the Trends section's period selector to both trend stores so a preset
   * or compare-toggle change refetches every trend chart in one place, and
   * registers {@link pageActions}.
   *
   * @since 1.0.0
   */
  public constructor() {
    registerPageActions(this.pageActions, this.pageActionsService, inject(DestroyRef));

    effect(() => {
      this.applyPeriodToTrendStores(this.selectedPeriod(), this.compareToPreviousPeriod());
    });
  }
  //#endregion

  //#region Methods — work queues and alerts
  /**
   * Method retryQueues
   *
   * @description
   * Re-runs both queue requests after a failure: the local queue loads
   * separately so it survives a network failure, and a retry that left it
   * behind would leave the page half-refreshed.
   *
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected retryQueues(): void {
    const organizationId: string | undefined = this.store.loadParams();

    this.store.load(organizationId);
    this.store.loadUnsynced(organizationId);
  }

  /**
   * Method openIntervention
   * @description Opens one intervention's record.
   * @access protected
   * @since 1.0.0
   * @param {InterventionOutput | OrganizationDashboardRecentIntervention} intervention - The intervention picked.
   * @returns {void}
   */
  protected openIntervention(
    intervention: InterventionOutput | OrganizationDashboardRecentIntervention,
  ): void {
    const organizationId: string | null = this.organizationContext.selectedOrganizationId();
    if (organizationId === null) return;

    void this.router.navigate(['/organizations', organizationId, 'interventions', intervention.id]);
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

  /**
   * Method responsibleInitials
   * @description The avatar fallback for a recent intervention's responsible member, empty when none is assigned.
   * @access protected
   * @since 1.0.0
   * @param {OrganizationDashboardRecentIntervention} intervention - The recent intervention row.
   * @returns {string} Up to two uppercase initials, or an empty string.
   */
  protected responsibleInitials(intervention: OrganizationDashboardRecentIntervention): string {
    return intervention.responsibleName
      ? getOrganizationInitials(intervention.responsibleName)
      : '';
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
  //#endregion

  //#region Internals
  /**
   * Method formatAlertMessage
   * @description Composes one alert row's localized, count-aware sentence. An unrecognized code falls back to the registry's label with the raw count.
   * @access private
   * @since 1.0.0
   * @param {string} code - Raw alert `code`.
   * @param {number} count - The alert's `count`.
   * @param {string} fallbackLabel - The registry's humanized label for an unrecognized code.
   * @returns {string} The localized sentence.
   */
  private formatAlertMessage(code: string, count: number, fallbackLabel: string): string {
    switch (code) {
      case 'critical_non_conformities_open':
        return $localize`:@@org.today.alerts.criticalNonConformitiesOpen:${count}:count: critical non-conformities still open`;
      case 'non_conformities_overdue':
        return $localize`:@@org.today.alerts.nonConformitiesOverdue:${count}:count: non-conformities overdue`;
      case 'expired_invitations':
        return $localize`:@@org.today.alerts.expiredInvitations:${count}:count: invitations expired`;
      case 'equipment_under_maintenance':
        return $localize`:@@org.today.alerts.equipmentUnderMaintenance:${count}:count: equipment items under maintenance`;
      default:
        return $localize`:@@org.today.alerts.generic:${fallbackLabel}:label: (${count}:count:)`;
    }
  }

  /**
   * Method alertLinkFor
   * @description Resolves the section an alert code is actually about. A code with no evident destination resolves to `null`, which the template renders as a plain, non-clickable row rather than guessing.
   * @access private
   * @since 1.0.0
   * @param {string} code - Raw alert `code`.
   * @param {string | null} organizationId - The routed organization, or `null` before it resolves.
   * @returns {StatTileLink | null} The destination, or `null` when none is evident.
   */
  private alertLinkFor(code: string, organizationId: string | null): StatTileLink | null {
    if (organizationId === null) return null;

    switch (code) {
      case 'critical_non_conformities_open':
      case 'non_conformities_overdue':
        return ['/organizations', organizationId, 'inspections'];
      case 'expired_invitations':
        return ['/organizations', organizationId, 'members'];
      case 'equipment_under_maintenance':
        return ['/organizations', organizationId, 'equipments'];
      default:
        return null;
    }
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
   * Method toHealthComparisonDelta
   * @description Converts a health metric's period-over-period delta (percentage points) into the `StatTileDelta` shape `app-stat-tile` accepts.
   * @access private
   * @since 1.0.0
   * @param {{ readonly delta: number; readonly direction: string } | null} entry - The health metric's comparison delta.
   * @param {boolean} positiveIsGood - Whether `up` is the desirable direction for this metric.
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
