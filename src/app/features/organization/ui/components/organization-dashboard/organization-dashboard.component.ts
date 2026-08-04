import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { Router } from '@angular/router';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  ORGANIZATION_PERMISSION,
  type OrganizationDashboardAlert,
  type OrganizationDashboardRecentIntervention,
} from '@features/organization/models';
import { OrganizationAttentionStore } from '@features/organization/state/organization-attention';
import { DashboardStore } from '@features/organization/state/organization-dashboard';
import type { TagSeverity } from '@shared/tag-severity';
import { DashboardAttentionPanel, DashboardRecentInterventions } from './components';
import type { DashboardAttentionRow } from './models/dashboard';

/**
 * Constant SEVERITY_ORDER
 *
 * @description
 * Render order of the attention rows: what can hurt the operation first, what is
 * merely waiting last.
 *
 * @since 1.4.0
 */
const SEVERITY_ORDER: readonly TagSeverity[] = ['danger', 'warn', 'info'];

/**
 * Component OrganizationDashboard
 * @class OrganizationDashboard
 *
 * @description
 * Work-queue surface of the organization: the attention panel naming what
 * waits on the operator, then the most recently updated interventions.
 * Facility/member/equipment/inspection KPIs and trend charts live on the
 * dedicated Statistics page ({@link OrganizationStatisticsPanel}) instead.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dashboard',
  templateUrl: './organization-dashboard.component.html',
  imports: [DashboardAttentionPanel, DashboardRecentInterventions],
  providers: [DashboardStore, OrganizationAttentionStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDashboard {
  //#region Properties

  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped store that owns the aggregate `/dashboard` fetch. Used
   * here for the backend alert feed and the recently updated interventions.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {DashboardStore}
   */
  protected readonly store: DashboardStore = inject<DashboardStore>(DashboardStore);

  /**
   * Property attention
   * @readonly
   *
   * @description
   * Component-scoped store owning the exact intervention counts behind the
   * attention panel. Separate from {@link store} because the counts come from the
   * interventions collection rather than the aggregate `/dashboard` payload.
   *
   * @access protected
   * @since 1.4.0
   *
   * @type {OrganizationAttentionStore}
   */
  protected readonly attention: OrganizationAttentionStore = inject<OrganizationAttentionStore>(
    OrganizationAttentionStore,
  );

  /**
   * Property organizationPermissionService
   * @readonly
   *
   * @description
   * Organization-owned helper exposing reactive permission checks for the
   * current active organization.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {OrganizationPermissionService}
   */
  protected readonly organizationPermissionService: OrganizationPermissionService =
    inject<OrganizationPermissionService>(OrganizationPermissionService);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Router used to open an intervention from the recent-interventions
   * table.
   *
   * @access private
   * @since 1.3.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property canReadDashboard
   * @readonly
   *
   * @description
   * Indicates whether the authenticated user can read the organization
   * dashboard itself. This is the same permission used by the overview route.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadDashboard: Signal<boolean> = computed<boolean>(() =>
    this.organizationPermissionService.hasPermission(ORGANIZATION_PERMISSION.DASHBOARD_READ),
  );

  /**
   * Property canReadMembers
   * @readonly
   *
   * @description
   * Indicates whether an `expired_invitations` alert row may link to the
   * members page.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadMembers: Signal<boolean> = computed<boolean>(
    () =>
      this.canReadDashboard() ||
      this.organizationPermissionService.hasPermission(ORGANIZATION_PERMISSION.MEMBERS_READ),
  );

  /**
   * Property canReadEquipment
   * @readonly
   *
   * @description
   * Indicates whether an `equipment_under_maintenance` alert row may link to
   * the equipments page.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadEquipment: Signal<boolean> = computed<boolean>(
    () =>
      this.canReadDashboard() ||
      this.organizationPermissionService.hasPermission(ORGANIZATION_PERMISSION.EQUIPMENT_READ),
  );

  /**
   * Property canReadInspections
   * @readonly
   *
   * @description
   * Indicates whether a non-conformity alert row may link to the
   * inspections page.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadInspections: Signal<boolean> = computed<boolean>(
    () =>
      this.canReadDashboard() ||
      this.organizationPermissionService.hasPermission(ORGANIZATION_PERMISSION.INSPECTION_READ),
  );

  /**
   * Property canReadRecentInterventions
   * @readonly
   *
   * @description
   * Indicates whether the recent-interventions table can be rendered.
   * Gated on the interventions read permission alone (not the dashboard
   * permission), because the backend embeds the rows only for callers
   * holding `organization.interventions.read`.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadRecentInterventions: Signal<boolean> = computed<boolean>(() =>
    this.organizationPermissionService.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_READ),
  );

  /**
   * Property attentionLoading
   * @readonly
   *
   * @description
   * Whether either source feeding the attention panel is still resolving.
   *
   * @access protected
   * @since 1.4.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly attentionLoading: Signal<boolean> = computed<boolean>(
    () => this.attention.isQueryLoading() || this.store.isQueryLoading(),
  );

  /**
   * Property attentionHasError
   * @readonly
   *
   * @description
   * Whether either source failed. Deliberately an OR rather than an AND: with one
   * source missing the panel cannot claim to list everything waiting, and an
   * "all clear" that is merely a failed request would be a lie.
   *
   * @access protected
   * @since 1.4.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly attentionHasError: Signal<boolean> = computed<boolean>(
    () => this.attention.queryHasError() || this.store.queryHasError(),
  );

  /**
   * Property attentionRows
   * @readonly
   *
   * @description
   * The work waiting on the operator, most severe first: intervention counts from
   * the interventions collection, then the backend alert feed. Rows at zero never
   * reach the panel, and a row whose destination the operator cannot read is
   * rendered but not navigable.
   *
   * @access protected
   * @since 1.4.0
   *
   * @type {Signal<readonly DashboardAttentionRow[]>}
   */
  protected readonly attentionRows: Signal<readonly DashboardAttentionRow[]> = computed<
    readonly DashboardAttentionRow[]
  >(() => {
    const rows: DashboardAttentionRow[] = [];

    if (this.canReadRecentInterventions()) {
      const overdue: number = this.attention.overdueCount();
      if (overdue > 0) {
        rows.push({
          id: 'interventions-overdue',
          label: $localize`:@@org.dash.attention.overdue:Interventions past their due date`,
          count: overdue,
          severity: 'danger',
          icon: 'pi pi-clock',
          navigable: true,
        });
      }

      const changesRequested: number = this.attention.changesRequestedCount();
      if (changesRequested > 0) {
        rows.push({
          id: 'interventions-changes-requested',
          label: $localize`:@@org.dash.attention.changesRequested:Interventions sent back for changes`,
          count: changesRequested,
          severity: 'warn',
          icon: 'pi pi-reply',
          navigable: true,
        });
      }

      const awaitingReview: number = this.attention.awaitingReviewCount();
      if (awaitingReview > 0) {
        rows.push({
          id: 'interventions-awaiting-review',
          label: $localize`:@@org.dash.attention.awaitingReview:Interventions awaiting review`,
          count: awaitingReview,
          severity: 'info',
          icon: 'pi pi-eye',
          navigable: true,
        });
      }
    }

    for (const alert of this.store.alerts()) {
      const row: DashboardAttentionRow | null = this.toAlertRow(alert);
      if (row) rows.push(row);
    }

    return rows.toSorted(
      (left, right) =>
        SEVERITY_ORDER.indexOf(left.severity) - SEVERITY_ORDER.indexOf(right.severity),
    );
  });

  //#endregion

  //#region Methods

  /**
   * Method openIntervention
   *
   * @description
   * Routes into the intervention workspace for the row activated in the
   * recent-interventions table.
   *
   * @access protected
   * @since 1.3.0
   *
   * @param {OrganizationDashboardRecentIntervention} intervention - Activated table row.
   * @returns {void}
   */
  protected openIntervention(intervention: OrganizationDashboardRecentIntervention): void {
    const organizationId: string | undefined = this.store.loadParams();
    if (!organizationId) return;

    void this.router.navigate(['/organizations', organizationId, 'interventions', intervention.id]);
  }

  /**
   * Method retryDashboard
   *
   * @description
   * Re-triggers the aggregate dashboard query after a failure surfaced
   * by the recent-interventions table.
   *
   * @access protected
   * @since 1.3.0
   *
   * @returns {void}
   */
  protected retryDashboard(): void {
    this.store.load(this.store.loadParams());
  }

  /**
   * Method openAttention
   *
   * @description
   * Routes to the surface that owns the activated attention row.
   *
   * @access protected
   * @since 1.4.0
   *
   * @param {string} rowId - Identifier emitted by the attention panel.
   * @returns {void}
   */
  protected openAttention(rowId: string): void {
    const organizationId: string | undefined = this.store.loadParams();
    if (!organizationId) return;

    const base: readonly string[] = ['/organizations', organizationId];

    switch (rowId) {
      case 'interventions-overdue':
      case 'interventions-changes-requested':
      case 'interventions-awaiting-review':
        void this.router.navigate([...base, 'interventions']);
        return;
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
   * Method retryAttention
   *
   * @description
   * Re-runs both sources behind the attention panel after a failure.
   *
   * @access protected
   * @since 1.4.0
   *
   * @returns {void}
   */
  protected retryAttention(): void {
    this.attention.load(this.attention.loadParams());
    this.store.load(this.store.loadParams());
  }

  /**
   * Method toAlertRow
   *
   * @description
   * Maps one backend alert onto a panel row, resolving its label, icon and
   * whether the operator may reach its destination. Returns null for an empty
   * count or a code this build does not know, so an unrecognised alert degrades
   * to silence rather than to a blank row.
   *
   * @access private
   * @since 1.4.0
   *
   * @param {OrganizationDashboardAlert} alert - One entry of the backend alert feed.
   * @returns {DashboardAttentionRow | null} The row to render, or null.
   */
  private toAlertRow(alert: OrganizationDashboardAlert): DashboardAttentionRow | null {
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
          navigable: this.canReadInspections(),
        };
      case 'non_conformities_overdue':
        return {
          id: alert.code,
          label: $localize`:@@org.dash.attention.overdueNonConformities:Non-conformities past their deadline`,
          count,
          severity,
          icon: 'pi pi-clock',
          navigable: this.canReadInspections(),
        };
      case 'expired_invitations':
        return {
          id: alert.code,
          label: $localize`:@@org.dash.attention.expiredInvitations:Invitations that expired unaccepted`,
          count,
          severity,
          icon: 'pi pi-envelope',
          navigable: this.canReadMembers(),
        };
      case 'equipment_under_maintenance':
        return {
          id: alert.code,
          label: $localize`:@@org.dash.attention.equipmentUnderMaintenance:Equipment currently under maintenance`,
          count,
          severity,
          icon: 'pi pi-wrench',
          navigable: this.canReadEquipment(),
        };
      default:
        return null;
    }
  }

  //#endregion
}
