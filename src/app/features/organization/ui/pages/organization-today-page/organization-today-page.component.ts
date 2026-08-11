import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBellRing,
  lucideCircleCheck,
  lucideClipboardCheck,
  lucideCompass,
  lucideMailWarning,
  lucideOctagonAlert,
  lucidePlus,
  lucideRefreshCw,
  lucideTriangleAlert,
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
  StatTile,
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
import { HlmCardImports } from '@shared/ui/card';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { ORGANIZATION_DASHBOARD_ALERT_TAG_ICON_CLASS } from './constants/organization-dashboard-alert-tag-icon-class.constants';
import { resolveOrganizationDashboardAlertTag } from './models';

/**
 * Constant MILLISECONDS_PER_DAY
 *
 * @description
 * Divisor turning a due-date gap into whole days.
 *
 * @since 1.0.0
 */
const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * Type OrganizationTodayKpiTile
 *
 * @description
 * View-model for one `app-stat-tile` in the page's KPI row: a fixed
 * near-term snapshot, so unlike the Statistics page's KPI row it carries no
 * comparison delta.
 *
 * @since 2.0.0
 */
type OrganizationTodayKpiTile = {
  readonly id: string;
  readonly label: string;
  readonly value: string | number;
  readonly icon: string;
  readonly link: StatTileLink | null;
};

/**
 * Type OrganizationTodayAlertRow
 *
 * @description
 * View-model for one row of the dashboard's backend-computed alert feed.
 *
 * @since 2.0.0
 */
type OrganizationTodayAlertRow = {
  readonly code: string;
  readonly message: string;
  readonly icon: string;
  readonly iconClass: string;
};

/**
 * Component OrganizationTodayPage
 * @class OrganizationTodayPage
 *
 * @description
 * Landing route of an organization. It answers one question — what needs me? —
 * with named queues holding real interventions: past due, sent back, awaiting
 * review, and waiting to sync. Above the queues, a KPI snapshot and the
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
 * @version 2.0.0
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
    StatTile,
    ...HlmAlertImports,
    ...HlmCardImports,
  ],
  providers: [
    DashboardStore,
    OrganizationTodayStore,
    provideIcons({
      lucideBellRing,
      lucideCircleCheck,
      lucideClipboardCheck,
      lucideCompass,
      lucideMailWarning,
      lucideOctagonAlert,
      lucidePlus,
      lucideRefreshCw,
      lucideTriangleAlert,
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
   * Property overdueNotes
   * @readonly
   *
   * @description
   * Secondary line of the overdue queue: how late each intervention is.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<Readonly<Record<string, string>>>}
   */
  protected readonly overdueNotes: Signal<Readonly<Record<string, string>>> = computed(
    (): Readonly<Record<string, string>> => {
      const notes: Record<string, string> = {};

      for (const intervention of this.store.overdue().items) {
        const days: number | null = this.daysLate(intervention.dueAt);
        if (days === null) continue;

        notes[intervention.id] = $localize`:@@org.today.overdueBy:${days}:days: days late`;
      }

      return notes;
    },
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
   * linking to the section that explains it.
   *
   * @access protected
   * @since 2.0.0
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
    const assetsLink: StatTileLink | null = organizationId
      ? ['/organizations', organizationId, 'assets']
      : null;

    const tiles: OrganizationTodayKpiTile[] = [];

    if (this.canReadInterventions()) {
      tiles.push({
        id: 'open-interventions',
        label: $localize`:@@org.today.kpi.openInterventions:Open interventions`,
        value:
          getOrganizationDashboardOverviewMetricValue(overview, 'interventions', 'open') ?? '—',
        icon: 'lucideCompass',
        link: interventionsLink,
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
      },
      {
        id: 'inspections-completed',
        label: $localize`:@@org.today.kpi.inspectionsCompleted:Inspections completed`,
        value:
          getOrganizationDashboardOverviewMetricValue(overview, 'inspections', 'closed') ?? '—',
        icon: 'lucideClipboardCheck',
        link: inspectionsLink,
      },
      {
        id: 'equipment-under-maintenance',
        label: $localize`:@@org.today.kpi.equipmentUnderMaintenance:Equipment under maintenance`,
        value:
          getOrganizationDashboardOverviewMetricValue(overview, 'equipment', 'underMaintenance') ??
          '—',
        icon: 'lucideWrench',
        link: assetsLink,
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
   * paired with the label in the same sentence.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<readonly OrganizationTodayAlertRow[]>}
   */
  protected readonly alertRows: Signal<readonly OrganizationTodayAlertRow[]> = computed(
    (): readonly OrganizationTodayAlertRow[] =>
      this.dashboardStore.alerts().map((alert): OrganizationTodayAlertRow => {
        const code: string = typeof alert.code === 'string' ? alert.code : '';
        const count: number = typeof alert.count === 'number' ? alert.count : 0;
        const descriptor = resolveOrganizationDashboardAlertTag(code);

        return {
          code,
          icon: descriptor.icon,
          iconClass: this.alertIconClass[descriptor.severity],
          message: this.formatAlertMessage(code, count, descriptor.label),
        };
      }),
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
   * Method openInterventions
   * @method openInterventions
   *
   * @description
   * Opens the full intervention list.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected openInterventions(): void {
    const organizationId: string | null = this.organizationContext.selectedOrganizationId();
    if (organizationId === null) return;

    void this.router.navigate(['/organizations', organizationId, 'interventions']);
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
  //#endregion

  //#region Internals
  /**
   * Method daysLate
   * @method daysLate
   *
   * @description
   * Whole days between a due date and now, or `null` when there is no date or
   * the date is unparseable.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string | null} dueAt - The intervention's due date.
   *
   * @returns {number | null} Days late, floored at one.
   */
  private daysLate(dueAt: string | null): number | null {
    if (dueAt === null) return null;

    const due: number = Date.parse(dueAt);
    if (Number.isNaN(due)) return null;

    return Math.max(1, Math.floor((Date.now() - due) / MILLISECONDS_PER_DAY));
  }

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
  //#endregion
}
