import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  InterventionOutput,
  InterventionUnsyncedEntry,
} from '@features/organization/features/interventions/models';
import {
  ORGANIZATION_PERMISSION,
  type OrganizationDashboardAlert,
  type OrganizationPermissionName,
} from '@features/organization/models';
import { DashboardStore } from '@features/organization/state/organization-dashboard';
import { OrganizationTodayStore } from '@features/organization/state/organization-today';
import {
  OrganizationTodayAlerts,
  OrganizationTodayQueue,
  type TodayAlertRow,
} from '@features/organization/ui/components';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { PageHeader } from '@shared/page-header';
import type { TagSeverity } from '@shared/tag-severity';

/**
 * Constant SEVERITY_ORDER
 *
 * @description
 * Render order of the alert rows: what can hurt the operation first, what is
 * merely waiting last.
 *
 * @since 2.0.0
 */
const SEVERITY_ORDER: readonly TagSeverity[] = ['danger', 'warn', 'info'];

/**
 * Constant MILLISECONDS_PER_DAY
 *
 * @description
 * Divisor turning a due-date gap into whole days.
 *
 * @since 2.0.0
 */
const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * Component OrganizationTodayPage
 * @class OrganizationTodayPage
 *
 * @description
 * Landing route of an organization. It answers one question — what needs me? —
 * with named queues holding real interventions: past due, sent back, awaiting
 * review, and waiting to sync. Inventory counts and trend charts live on the
 * Statistics page instead.
 *
 * The page owns orchestration: it holds the stores, resolves permissions,
 * localizes the row notes and performs navigation; its children only render
 * (ARCHITECTURE.md §10.1).
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-today',
  templateUrl: './organization-today.component.html',
  imports: [
    ButtonModule,
    PageHeader,
    EmptyState,
    ErrorState,
    OrganizationTodayQueue,
    OrganizationTodayAlerts,
  ],
  providers: [OrganizationTodayStore, DashboardStore],
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
   * @since 2.0.0
   *
   * @type {OrganizationTodayStore}
   */
  protected readonly store: OrganizationTodayStore =
    inject<OrganizationTodayStore>(OrganizationTodayStore);

  /**
   * Property dashboard
   * @readonly
   *
   * @description
   * Component-scoped store owning the aggregate `/dashboard` fetch, read here
   * only for its alert feed. Its metrics and trends belong to the Statistics
   * page.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {DashboardStore}
   */
  protected readonly dashboard: DashboardStore = inject<DashboardStore>(DashboardStore);

  /**
   * Property organizationPermissionService
   * @readonly
   *
   * @description
   * Organization-owned helper exposing reactive permission checks for the
   * current active organization.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {OrganizationPermissionService}
   */
  private readonly organizationPermissionService: OrganizationPermissionService =
    inject<OrganizationPermissionService>(OrganizationPermissionService);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Router used to open an intervention, a filtered list, or the surface
   * owning an alert.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property canReadInterventions
   * @readonly
   *
   * @description
   * Whether the intervention queues may be rendered. Gated on the
   * interventions permission alone: the queues come from that collection.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadInterventions: Signal<boolean> = computed<boolean>(() =>
    this.organizationPermissionService.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_READ),
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
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canCreateInterventions: Signal<boolean> = computed<boolean>(() =>
    this.organizationPermissionService.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN),
  );

  /**
   * Property canReadDashboard
   * @readonly
   *
   * @description
   * Whether the aggregate dashboard — and therefore the alert strip — may be
   * rendered.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadDashboard: Signal<boolean> = computed<boolean>(() =>
    this.organizationPermissionService.hasPermission(ORGANIZATION_PERMISSION.DASHBOARD_READ),
  );

  /**
   * Property unsynced
   * @readonly
   *
   * @description
   * Interventions still holding queued local operations.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<readonly InterventionOutput[]>}
   */
  protected readonly unsynced: Signal<readonly InterventionOutput[]> = computed<
    readonly InterventionOutput[]
  >(() => this.store.unsynced().map((entry: InterventionUnsyncedEntry) => entry.intervention));

  /**
   * Property overdueNotes
   * @readonly
   *
   * @description
   * Secondary line of the overdue queue: how late each intervention is.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<Readonly<Record<string, string>>>}
   */
  protected readonly overdueNotes: Signal<Readonly<Record<string, string>>> = computed<
    Readonly<Record<string, string>>
  >(() => {
    const notes: Record<string, string> = {};

    for (const intervention of this.store.overdue().items) {
      const days: number | null = this.daysLate(intervention.dueAt);
      if (days === null) continue;

      notes[intervention.id] = $localize`:@@org.today.overdueBy:${days}:days: days late`;
    }

    return notes;
  });

  /**
   * Property unsyncedNotes
   * @readonly
   *
   * @description
   * Secondary line of the unsynced queue: how many local changes are queued.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<Readonly<Record<string, string>>>}
   */
  protected readonly unsyncedNotes: Signal<Readonly<Record<string, string>>> = computed<
    Readonly<Record<string, string>>
  >(() => {
    const notes: Record<string, string> = {};

    for (const entry of this.store.unsynced()) {
      notes[entry.intervention.id] =
        $localize`:@@org.today.pendingChanges:${entry.pendingCount}:count: changes waiting to sync`;
    }

    return notes;
  });

  /**
   * Property nextUpcoming
   * @readonly
   *
   * @description
   * The nearest planned intervention still ahead, shown once nothing is
   * waiting so the all-clear points somewhere.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<InterventionOutput | undefined>}
   */
  protected readonly nextUpcoming: Signal<InterventionOutput | undefined> = computed<
    InterventionOutput | undefined
  >(() => this.store.upcoming().items[0]);

  /**
   * Property alertRows
   * @readonly
   *
   * @description
   * The backend alert feed as rows, most severe first. A row at zero, or one
   * whose code this build does not know, never reaches the strip.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<readonly TodayAlertRow[]>}
   */
  protected readonly alertRows: Signal<readonly TodayAlertRow[]> = computed<
    readonly TodayAlertRow[]
  >(() => {
    if (!this.canReadDashboard()) return [];

    const rows: TodayAlertRow[] = [];

    for (const alert of this.dashboard.alerts()) {
      const row: TodayAlertRow | null = this.toAlertRow(alert);
      if (row) rows.push(row);
    }

    return rows.toSorted(
      (left, right) =>
        SEVERITY_ORDER.indexOf(left.severity) - SEVERITY_ORDER.indexOf(right.severity),
    );
  });

  /**
   * Property waitingCount
   * @readonly
   *
   * @description
   * How many things wait on the operator, across queues and alerts. Drives the
   * page subtitle.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly waitingCount: Signal<number> = computed<number>(
    () =>
      this.store.waitingCount() +
      this.alertRows().reduce((sum: number, row: TodayAlertRow) => sum + row.count, 0),
  );

  /**
   * Property isAllClear
   * @readonly
   *
   * @description
   * Whether every source resolved and none of them found work. Deliberately
   * false while anything is still loading or after a failure, so the all-clear
   * is only ever claimed on evidence.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isAllClear: Signal<boolean> = computed<boolean>(() => {
    if (this.canReadInterventions() && !this.store.isAllClear()) return false;

    if (this.canReadDashboard()) {
      if (this.dashboard.isQueryLoading() || this.dashboard.queryHasError()) return false;
      if (this.alertRows().length > 0) return false;
    }

    return this.canReadInterventions() || this.canReadDashboard();
  });

  /**
   * Property hasQueueError
   * @readonly
   *
   * @description
   * Whether the collection queues failed. The unsynced queue is excluded on
   * purpose: it is read locally and keeps rendering when the network does not.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasQueueError: Signal<boolean> = computed<boolean>(
    () => this.canReadInterventions() && this.store.hasError(),
  );

  /**
   * Property subtitle
   * @readonly
   *
   * @description
   * One sentence sizing the day. Absent while anything is still resolving, and
   * absent on the all-clear, where the empty state says it better.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<string | undefined>}
   */
  protected readonly subtitle: Signal<string | undefined> = computed<string | undefined>(() => {
    if (this.store.isLoading() || this.isAllClear()) return undefined;

    const count: number = this.waitingCount();
    if (count === 0) return undefined;

    return count === 1
      ? $localize`:@@org.today.subtitleOne:One thing needs a decision from you.`
      : $localize`:@@org.today.subtitleMany:${count}:count: things need a decision from you.`;
  });

  /**
   * Property upcomingLabel
   * @readonly
   *
   * @description
   * Label of the all-clear's forward action, sized to how much is planned.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly upcomingLabel: Signal<string> = computed<string>(() => {
    const total: number = this.store.upcoming().total;

    return total === 1
      ? $localize`:@@org.today.upcomingOne:See the one planned intervention`
      : $localize`:@@org.today.upcomingMany:See the ${total}:count: planned interventions`;
  });
  //#endregion

  //#region Methods
  /**
   * Method openIntervention
   *
   * @description
   * Routes into the intervention workspace for an activated queue row.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {InterventionOutput} intervention - Activated row.
   * @returns {void}
   */
  protected openIntervention(intervention: InterventionOutput): void {
    const organizationId: string | undefined = this.store.loadParams();
    if (!organizationId) return;

    void this.router.navigate(['/organizations', organizationId, 'interventions', intervention.id]);
  }

  /**
   * Method openInterventions
   *
   * @description
   * Opens the interventions list.
   *
   * A queue is meant to be the same question as a list view seen at a smaller
   * scale, but the list has no status filter to preselect yet — filtering
   * arrives with its named work views. Until then every queue opens the list
   * unfiltered rather than passing a query param nothing reads.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected openInterventions(): void {
    const organizationId: string | undefined = this.store.loadParams();
    if (!organizationId) return;

    void this.router.navigate(['/organizations', organizationId, 'interventions']);
  }

  /**
   * Method createIntervention
   *
   * @description
   * Opens the interventions list with its creation drawer requested, so the
   * primary action starts the work rather than merely pointing at where it
   * starts.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected createIntervention(): void {
    const organizationId: string | undefined = this.store.loadParams();
    if (!organizationId) return;

    void this.router.navigate(['/organizations', organizationId, 'interventions'], {
      queryParams: { create: 1 },
    });
  }

  /**
   * Method openAlert
   *
   * @description
   * Routes to the surface that owns an activated alert row.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {string} rowId - Identifier emitted by the alert strip.
   * @returns {void}
   */
  protected openAlert(rowId: string): void {
    const organizationId: string | undefined = this.store.loadParams();
    if (!organizationId) return;

    const base: readonly string[] = ['/organizations', organizationId];

    switch (rowId) {
      case 'critical_non_conformities_open':
      case 'non_conformities_overdue':
        void this.router.navigate([...base, 'inspections']);
        return;
      case 'expired_invitations':
        void this.router.navigate([...base, 'members']);
        return;
      case 'equipment_under_maintenance':
        void this.router.navigate([...base, 'equipments']);
        return;
      default:
        return;
    }
  }

  /**
   * Method retryAlerts
   *
   * @description
   * Re-runs the aggregate dashboard query after the alert strip reported a
   * failure.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected retryAlerts(): void {
    this.dashboard.load(this.dashboard.loadParams());
  }

  /**
   * Method retryQueues
   *
   * @description
   * Re-runs the collection queues after a failure.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected retryQueues(): void {
    this.store.load(this.store.loadParams());
  }

  /**
   * Method daysLate
   *
   * @description
   * Whole days between a due date and now, or null when the date is absent,
   * unparseable, or not yet past.
   *
   * @access private
   * @since 2.0.0
   *
   * @param {string | null | undefined} dueAt - Due date, ISO 8601.
   * @returns {number | null} Days late, or null.
   */
  private daysLate(dueAt: string | null | undefined): number | null {
    if (!dueAt) return null;

    const due: number = Date.parse(dueAt);
    if (Number.isNaN(due)) return null;

    const days: number = Math.floor((Date.now() - due) / MILLISECONDS_PER_DAY);

    return days > 0 ? days : null;
  }

  /**
   * Method toAlertRow
   *
   * @description
   * Maps one backend alert onto a strip row, resolving its label, icon and
   * whether the operator may reach its destination. Returns null for an empty
   * count or a code this build does not know, so an unrecognised alert degrades
   * to silence rather than to a blank row.
   *
   * @access private
   * @since 2.0.0
   *
   * @param {OrganizationDashboardAlert} alert - One entry of the backend alert feed.
   * @returns {TodayAlertRow | null} The row to render, or null.
   */
  private toAlertRow(alert: OrganizationDashboardAlert): TodayAlertRow | null {
    const count: number = alert.count ?? 0;
    if (count <= 0) return null;

    const severity: TagSeverity = alert.severity === 'high' ? 'danger' : 'warn';

    switch (alert.code) {
      case 'critical_non_conformities_open':
        return {
          id: alert.code,
          label: $localize`:@@org.dash.attention.criticalNonConformities:Critical non-conformities still open`,
          count,
          severity,
          icon: 'pi pi-exclamation-triangle',
          navigable: this.canReach(ORGANIZATION_PERMISSION.INSPECTION_READ),
        };
      case 'non_conformities_overdue':
        return {
          id: alert.code,
          label: $localize`:@@org.dash.attention.overdueNonConformities:Non-conformities past their deadline`,
          count,
          severity,
          icon: 'pi pi-clock',
          navigable: this.canReach(ORGANIZATION_PERMISSION.INSPECTION_READ),
        };
      case 'expired_invitations':
        return {
          id: alert.code,
          label: $localize`:@@org.dash.attention.expiredInvitations:Invitations that expired unaccepted`,
          count,
          severity,
          icon: 'pi pi-envelope',
          navigable: this.canReach(ORGANIZATION_PERMISSION.MEMBERS_READ),
        };
      case 'equipment_under_maintenance':
        return {
          id: alert.code,
          label: $localize`:@@org.dash.attention.equipmentUnderMaintenance:Equipment currently under maintenance`,
          count,
          severity,
          icon: 'pi pi-wrench',
          navigable: this.canReach(ORGANIZATION_PERMISSION.EQUIPMENT_READ),
        };
      default:
        return null;
    }
  }

  /**
   * Method canReach
   *
   * @description
   * Whether an alert row may link to its destination. Dashboard readers reach
   * every destination the feed reports; anyone else needs the destination's own
   * read permission.
   *
   * @access private
   * @since 2.0.0
   *
   * @param {OrganizationPermissionName} permission - Permission guarding the destination.
   * @returns {boolean} Whether the row is navigable.
   */
  private canReach(permission: OrganizationPermissionName): boolean {
    return this.canReadDashboard() || this.organizationPermissionService.hasPermission(permission);
  }
  //#endregion
}
