import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBellRing,
  lucideChevronRight,
  lucideCircleCheck,
  lucideCloudUpload,
  lucideEye,
  lucideMailWarning,
  lucideMinus,
  lucideOctagonAlert,
  lucidePlus,
  lucideRefreshCw,
  lucideTrendingDown,
  lucideTrendingUp,
  lucideTriangleAlert,
  lucideUndo2,
  lucideWrench,
} from '@ng-icons/lucide';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  InterventionOutput,
  InterventionUnsyncedEntry,
} from '@features/organization/features/interventions/models';
import { InterventionTag } from '@features/organization/features/interventions/ui/components';
import {
  ORGANIZATION_PERMISSION,
  type OrganizationDashboardRecentIntervention,
} from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import { DashboardStore } from '@features/organization/state/organization-dashboard';
import { OrganizationTodayStore } from '@features/organization/state/organization-today';
import {
  OrganizationPageHeader,
  OrganizationTodayQueue,
  type StatTileDelta,
  type StatTileDeltaDirection,
  type StatTileLink,
} from '@features/organization/ui/components';
import {
  getOrganizationDashboardOverviewMetricValue,
  getOrganizationInitials,
} from '@features/organization/utils';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmAvatar, HlmAvatarFallback, HlmAvatarImage } from '@shared/ui/avatar';
import { HlmButton } from '@shared/ui/button';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { ORGANIZATION_DASHBOARD_ALERT_TAG_ICON_CLASS } from './constants/organization-dashboard-alert-tag-icon-class.constants';
import { resolveOrganizationDashboardAlertTag } from './models';

/**
 * Type OrganizationTodayKpiTile
 *
 * @description
 * View-model for one cell of the page's inline KPI strip: a fixed near-term
 * snapshot, so most cells carry no comparison delta — only
 * `inspections-completed` reads one, because it is the one cell whose value
 * matches a `DashboardStore` comparison entry one for one (`FEATURE.md`).
 *
 * @since 2.1.0
 */
type OrganizationTodayKpiTile = {
  readonly id: string;
  readonly label: string;
  readonly value: string | number;
  readonly link: StatTileLink | null;
  readonly delta: StatTileDelta | null;
};

/**
 * Type OrganizationTodayAlertRow
 *
 * @description
 * View-model for one row of the dashboard's backend-computed alert feed.
 * `link` is `null` when the code names nothing this app can navigate to yet,
 * which keeps the row a plain sentence instead of a dead link.
 *
 * @since 2.1.0
 */
type OrganizationTodayAlertRow = {
  readonly code: string;
  readonly message: string;
  readonly icon: string;
  readonly iconClass: string;
  readonly link: StatTileLink | null;
};

/**
 * Component OrganizationTodayPage
 * @class OrganizationTodayPage
 *
 * @description
 * Landing route of an organization. It answers one question — what needs me? —
 * with named queues holding real interventions: past due, sent back, awaiting
 * review, and waiting to sync. Above the queues, a quiet KPI strip and the
 * backend's alert feed (`DashboardStore`) give a fixed near-term read of the
 * organization; a "Recently updated" list closes the page with what changed
 * lately. Inventory counts and trend charts stay on the Statistics page.
 *
 * The page owns orchestration: it holds both stores, resolves permissions,
 * localizes the row notes and performs navigation; its children only render
 * (`ARCHITECTURE.md` §10.1). A `DashboardStore` query failure — including a
 * permission denial — hides the KPI, alert and recent-interventions sections
 * rather than surfacing a second error state; the work queues below are the
 * page's primary content and stay usable regardless.
 *
 * Below the header, the KPI strip is a single row of label/value pairs
 * (`text-base font-semibold`, never the 24px reserved for the page title) so
 * it reads as a snapshot rather than a second headline. A two-column layout
 * then pairs the work queues (the primary column) with a rail holding the
 * alert strip and the "Recently updated" list, collapsing to one stacked
 * column under `lg`. The four named queues render as one borderless "Your
 * work queues" section: a divider list where each row (icon, label, count) is
 * itself the link to the deep-linked interventions view — chrome comes from
 * rhythm, not from a card per queue. The unsynced queue is the one exception:
 * its content is local-only and reachable nowhere else, so its row stays
 * un-linked and keeps `OrganizationTodayQueue` rendered in `embedded` mode
 * underneath it as the page's one remaining in-page preview.
 *
 * @version 3.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-today-page',
  imports: [
    DatePipe,
    NgIcon,
    RouterLink,
    EmptyState,
    ErrorState,
    HlmAvatar,
    HlmAvatarFallback,
    HlmAvatarImage,
    HlmButton,
    HlmSkeleton,
    InterventionTag,
    OrganizationPageHeader,
    OrganizationTodayQueue,
    ...HlmAlertImports,
  ],
  providers: [
    DashboardStore,
    OrganizationTodayStore,
    provideIcons({
      lucideBellRing,
      lucideChevronRight,
      lucideCircleCheck,
      lucideCloudUpload,
      lucideEye,
      lucideMailWarning,
      lucideMinus,
      lucideOctagonAlert,
      lucidePlus,
      lucideRefreshCw,
      lucideTrendingDown,
      lucideTrendingUp,
      lucideTriangleAlert,
      lucideUndo2,
      lucideWrench,
    }),
  ],
  templateUrl: './organization-today-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationTodayPage {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped store owning the work queues, network and local alike.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {OrganizationTodayStore}
   */
  protected readonly store: OrganizationTodayStore =
    inject<OrganizationTodayStore>(OrganizationTodayStore);

  /**
   * Property dashboardStore
   * @readonly
   *
   * @description
   * Owns the aggregate `/dashboard` payload this page reads from: the
   * overview counts behind the KPI row, the alert feed, and the recently
   * updated interventions list. Component-scoped separately from the
   * Statistics page's own copy (`FEATURE.md`).
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {DashboardStore}
   */
  protected readonly dashboardStore: DashboardStore = inject<DashboardStore>(DashboardStore);

  /**
   * Property organizationContext
   * @readonly
   *
   * @description
   * The routed organization, used to name the page and to build destinations.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {OrganizationContextPort}
   */
  protected readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property permissionService
   * @readonly
   *
   * @description
   * Organization-owned helper exposing reactive permission checks.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationPermissionService}
   */
  private readonly permissionService: OrganizationPermissionService =
    inject<OrganizationPermissionService>(OrganizationPermissionService);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Used to open an intervention or a filtered list.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property alertIconClass
   * @readonly
   *
   * @description
   * The severity-to-colour map for the alert strip's icons, exposed so the
   * template can index it without branching on severity itself.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {typeof ORGANIZATION_DASHBOARD_ALERT_TAG_ICON_CLASS}
   */
  protected readonly alertIconClass: typeof ORGANIZATION_DASHBOARD_ALERT_TAG_ICON_CLASS =
    ORGANIZATION_DASHBOARD_ALERT_TAG_ICON_CLASS;

  /**
   * Property organizationName
   * @readonly
   *
   * @description
   * The open organization, shown under the heading so the page says which
   * workspace it is reporting on.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly organizationName: Signal<string> = computed(
    (): string => this.organizationContext.selectedOrganization()?.name ?? '',
  );

  /**
   * Property canReadInterventions
   * @readonly
   *
   * @description
   * Whether the queues, the "open interventions" KPI tile and the recent
   * interventions list may be rendered. Gated on the interventions
   * permission alone: all three come from that collection.
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
   * Property canCreateInterventions
   * @readonly
   *
   * @description
   * Whether the page may offer to start an intervention. Planning is the
   * permission the interventions list itself gates creation on.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canCreateInterventions: Signal<boolean> = computed((): boolean =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN),
  );

  /**
   * Property unsynced
   * @readonly
   *
   * @description
   * Interventions still holding queued local operations, flattened to the
   * shape the queue component renders.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly InterventionOutput[]>}
   */
  protected readonly unsynced: Signal<readonly InterventionOutput[]> = computed(
    (): readonly InterventionOutput[] =>
      this.store
        .unsynced()
        .map((entry: InterventionUnsyncedEntry): InterventionOutput => entry.intervention),
  );

  /**
   * Property unsyncedNotes
   * @readonly
   *
   * @description
   * Secondary line of the unsynced queue: how many local changes are queued.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<Readonly<Record<string, string>>>}
   */
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

  /**
   * Property nextUpcoming
   * @readonly
   *
   * @description
   * The nearest planned intervention still ahead, shown once nothing is
   * waiting so the all-clear points somewhere.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<InterventionOutput | undefined>}
   */
  protected readonly nextUpcoming: Signal<InterventionOutput | undefined> = computed(
    (): InterventionOutput | undefined => this.store.upcoming().items[0],
  );

  /**
   * Property kpiTiles
   * @readonly
   *
   * @description
   * The KPI row's view-models: open interventions (permission-gated), open
   * non-conformities, completed inspections and equipment under maintenance
   * — the fixed near-term snapshot `DashboardStore` always reports, each
   * linking to the section that explains it. Only `inspections-completed`
   * carries a delta: `DashboardStore.inspectionsComparison` compares the
   * same `inspections`/`closed` figure this tile shows, the same pairing
   * `OrganizationStatisticsPage` uses for its own inspections tile. The
   * other three tiles have no matching comparison entry in the dashboard
   * payload — `equipmentComparison`, in particular, tracks the total
   * equipment count, not the `underMaintenance` subset this tile shows, so
   * it is not a legitimate delta for it.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {Signal<readonly OrganizationTodayKpiTile[]>}
   */
  protected readonly kpiTiles: Signal<readonly OrganizationTodayKpiTile[]> = computed(() => {
    const overview = this.dashboardStore.queryData()?.overview;
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

    const tiles: OrganizationTodayKpiTile[] = [];

    if (this.canReadInterventions()) {
      tiles.push({
        id: 'open-interventions',
        label: $localize`:@@org.today.kpi.openInterventions:Open interventions`,
        value:
          getOrganizationDashboardOverviewMetricValue(overview, 'interventions', 'open') ?? '—',
        link: interventionsLink,
        delta: null,
      });
    }

    tiles.push(
      {
        id: 'open-non-conformities',
        label: $localize`:@@org.today.kpi.openNonConformities:Open non-conformities`,
        value:
          getOrganizationDashboardOverviewMetricValue(overview, 'nonConformities', 'open') ?? '—',
        link: inspectionsLink,
        delta: null,
      },
      {
        id: 'inspections-completed',
        label: $localize`:@@org.today.kpi.inspectionsCompleted:Inspections completed`,
        value:
          getOrganizationDashboardOverviewMetricValue(overview, 'inspections', 'closed') ?? '—',
        link: inspectionsLink,
        delta: this.toComparisonDelta(this.dashboardStore.inspectionsComparison(), true),
      },
      {
        id: 'equipment-under-maintenance',
        label: $localize`:@@org.today.kpi.equipmentUnderMaintenance:Equipment under maintenance`,
        value:
          getOrganizationDashboardOverviewMetricValue(overview, 'equipment', 'underMaintenance') ??
          '—',
        link: equipmentsLink,
        delta: null,
      },
    );

    return tiles;
  });

  /**
   * Property alertRows
   * @readonly
   *
   * @description
   * The dashboard's backend-computed alert feed, resolved through the page's
   * alert-code registry into a localized, count-aware sentence per row.
   * Severity is never carried by colour alone: the icon and its tint are
   * paired with the label in the same sentence. `link` routes to the
   * section the code is actually about, resolved by {@link alertLinkFor};
   * a code with no evident destination renders as a plain, non-clickable
   * row.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {Signal<readonly OrganizationTodayAlertRow[]>}
   */
  protected readonly alertRows: Signal<readonly OrganizationTodayAlertRow[]> = computed(
    (): readonly OrganizationTodayAlertRow[] => {
      const organizationId: string | null = this.organizationContext.selectedOrganizationId();

      return this.dashboardStore.alerts().map((alert): OrganizationTodayAlertRow => {
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

  /**
   * Property recentInterventions
   * @readonly
   *
   * @description
   * The dashboard's most recently updated interventions, empty while the
   * caller lacks {@link canReadInterventions} — the backend omits the field
   * entirely in that case.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<readonly OrganizationDashboardRecentIntervention[]>}
   */
  protected readonly recentInterventions: Signal<
    readonly OrganizationDashboardRecentIntervention[]
  > = computed((): readonly OrganizationDashboardRecentIntervention[] =>
    this.dashboardStore.recentInterventions(),
  );
  //#endregion

  //#region Methods
  /**
   * Method retryQueues
   * @method retryQueues
   *
   * @description
   * Re-runs both queue requests after a failure: the local queue loads
   * separately so it survives a network failure, and a retry that left it
   * behind would leave the page half-refreshed.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected retryQueues(): void {
    const organizationId: string | undefined = this.store.loadParams();

    this.store.load(organizationId);
    this.store.loadUnsynced(organizationId);
  }

  /**
   * Method openIntervention
   * @method openIntervention
   *
   * @description
   * Opens one intervention's record.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionOutput | OrganizationDashboardRecentIntervention} intervention - The intervention picked.
   *
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
   * @method startIntervention
   *
   * @description
   * Opens the intervention list with its creation drawer already open.
   *
   * `?create=1` is the interventions subfeature's published contract for this:
   * it lets this page's primary action actually start the work without
   * duplicating the creation drawer here.
   *
   * @access protected
   * @since 2.0.0
   *
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
   * @method responsibleInitials
   *
   * @description
   * The avatar fallback for a recent intervention's responsible member,
   * empty when none is assigned.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {OrganizationDashboardRecentIntervention} intervention - The recent intervention row.
   *
   * @returns {string} Up to two uppercase initials, or an empty string.
   */
  protected responsibleInitials(intervention: OrganizationDashboardRecentIntervention): string {
    return intervention.responsibleName
      ? getOrganizationInitials(intervention.responsibleName)
      : '';
  }

  /**
   * Method kpiDeltaIcon
   * @method kpiDeltaIcon
   *
   * @description
   * The arrow matching a KPI delta's literal direction — never its sentiment.
   * Mirrors `StatTile.deltaIcon`; not shared, since the strip renders its own
   * compact delta rather than composing `app-stat-tile` (`ARCHITECTURE.md`
   * rule of three).
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {StatTileDelta} delta - The KPI cell's delta.
   *
   * @returns {string} A registered lucide icon name.
   */
  protected kpiDeltaIcon(delta: StatTileDelta): string {
    if (delta.direction === 'up') return 'lucideTrendingUp';
    if (delta.direction === 'down') return 'lucideTrendingDown';

    return 'lucideMinus';
  }

  /**
   * Method kpiDeltaGood
   * @method kpiDeltaGood
   *
   * @description
   * Whether a KPI delta's direction is the desirable one, `null` when flat.
   * Drives the icon's foreground-vs-muted weight — the only tone the strip
   * spends on a trend, chroma being reserved for status glyphs (`DESIGN.md`).
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {StatTileDelta} delta - The KPI cell's delta.
   *
   * @returns {boolean | null} Whether the direction is desirable, or `null` when flat.
   */
  protected kpiDeltaGood(delta: StatTileDelta): boolean | null {
    if (delta.direction === 'flat') return null;

    return (delta.direction === 'up') === delta.positiveIsGood;
  }

  /**
   * Method kpiDeltaText
   * @method kpiDeltaText
   *
   * @description
   * The signed magnitude shown beside a KPI delta's arrow.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {StatTileDelta} delta - The KPI cell's delta.
   *
   * @returns {string} The signed magnitude.
   */
  protected kpiDeltaText(delta: StatTileDelta): string {
    if (delta.direction === 'up') return `+${delta.value}`;
    if (delta.direction === 'down') return `−${delta.value}`;

    return `${delta.value}`;
  }
  //#endregion

  //#region Internals
  /**
   * Method formatAlertMessage
   * @method formatAlertMessage
   *
   * @description
   * Composes one alert row's localized, count-aware sentence. The four
   * codes `GetOrganizationDashboardHandler` emits each get their own
   * grammatical sentence; an unrecognized code falls back to the registry's
   * label with the raw count, so a future backend code degrades to a
   * readable row instead of nothing.
   *
   * @access private
   * @since 2.0.0
   *
   * @param {string} code - Raw alert `code`.
   * @param {number} count - The alert's `count`.
   * @param {string} fallbackLabel - The registry's humanized label for an unrecognized code.
   *
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
   * @method alertLinkFor
   *
   * @description
   * Resolves the section an alert code is actually about. `equipment_under_maintenance`
   * routes to the equipment list (not the `assets` route, which is not
   * mounted yet — see `FEATURE.md`); the two non-conformity codes route to
   * Inspections, where non-conformities live; `expired_invitations` routes
   * to Members. A code with no evident destination — including this
   * registry's own unrecognized-code fallback — resolves to `null`, which
   * the template renders as a plain, non-clickable row rather than guessing.
   *
   * @access private
   * @since 2.1.0
   *
   * @param {string} code - Raw alert `code`.
   * @param {string | null} organizationId - The routed organization, or `null` before it resolves.
   *
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
   * @method toComparisonDelta
   *
   * @description
   * Converts one of `DashboardStore`'s `*Comparison` signals — a pre-signed
   * string magnitude and a literal direction — into the `StatTileDelta`
   * shape `app-stat-tile` accepts. Mirrors
   * `OrganizationStatisticsPage.toComparisonDelta`; not shared, since this
   * is only the second usage (`ARCHITECTURE.md` rule of three).
   *
   * @access private
   * @since 2.1.0
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
  //#endregion
}
