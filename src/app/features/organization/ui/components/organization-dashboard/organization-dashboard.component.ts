import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { Router } from '@angular/router';
import { ACCOUNT_PERMISSION, UserPermissionService } from '@features/account';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  ComplianceSummaryStore,
  type ComplianceSummaryStoreType,
} from '@features/organization/features/compliance/state';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  DashboardStore,
  RecentActivityStore,
  UpcomingInterventionsStore,
  type RecentActivityStoreType,
  type UpcomingInterventionsStoreType,
} from '@features/organization/state/organization-dashboard';
import { EmptyState } from '@shared/components';
import {
  ComplianceBySite,
  DashboardMetricCell,
  DashboardMetricStrip,
  DashboardRecentActivity,
  DashboardUpcomingInterventions,
  EquipmentStatusBreakdown,
  InspectionResultBreakdown,
  InspectionsTrend,
  NonConformitiesBySeverity,
  NonConformitiesTrend,
} from './components';

/**
 * Component OrganizationDashboard
 * @class OrganizationDashboard
 *
 * @description
 * Smart dashboard component for the organization overview page, laid out as
 * the prototype's nine modules: the four-cell metric strip, a grid of chart
 * cards (non-conformities trend, equipment status, inspections, severity
 * bars, inspection results), and a lower band with upcoming interventions,
 * recent activity and compliance by site. Delegates data fetching to the
 * aggregate `DashboardStore` plus the compliance, upcoming-interventions and
 * recent-activity slices, each gated by its own permission.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dashboard',
  templateUrl: './organization-dashboard.component.html',
  imports: [
    DashboardMetricStrip,
    DashboardMetricCell,
    DashboardRecentActivity,
    DashboardUpcomingInterventions,
    NonConformitiesTrend,
    InspectionsTrend,
    EquipmentStatusBreakdown,
    InspectionResultBreakdown,
    NonConformitiesBySeverity,
    ComplianceBySite,
    EmptyState,
  ],
  providers: [
    DashboardStore,
    ComplianceSummaryStore,
    UpcomingInterventionsStore,
    RecentActivityStore,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDashboard {
  //#region Properties

  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped store that owns the aggregate `/dashboard` fetch and
   * the metric/breakdown derivations.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {DashboardStore}
   */
  protected readonly store: DashboardStore = inject<DashboardStore>(DashboardStore);

  /**
   * Property complianceStore
   * @readonly
   *
   * @description
   * Component-scoped instance of the nested compliance feature's summary
   * store, consumed through its published `state` barrel. It feeds the
   * compliance-rate and equipment-due-soon metric cells plus the
   * "Compliance by site" card.
   *
   * @access protected
   * @since 1.4.0
   *
   * @type {ComplianceSummaryStoreType}
   */
  protected readonly complianceStore: ComplianceSummaryStoreType =
    inject<ComplianceSummaryStoreType>(ComplianceSummaryStore);

  /**
   * Property upcomingStore
   * @readonly
   *
   * @description
   * Component-scoped slice loading the five soonest-due interventions for
   * the "Upcoming interventions" card.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {UpcomingInterventionsStoreType}
   */
  protected readonly upcomingStore: UpcomingInterventionsStoreType =
    inject<UpcomingInterventionsStoreType>(UpcomingInterventionsStore);

  /**
   * Property activityStore
   * @readonly
   *
   * @description
   * Component-scoped slice loading the newest audit ledger entries for the
   * "Recent activity" feed.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {RecentActivityStoreType}
   */
  protected readonly activityStore: RecentActivityStoreType =
    inject<RecentActivityStoreType>(RecentActivityStore);

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
   * Property userPermissionService
   * @readonly
   *
   * @description
   * Account-owned helper for the **global** permission surface — the audit
   * ledger is gated by `audit.read`, a platform capability rather than an
   * organization permission.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {UserPermissionService}
   */
  private readonly userPermissionService: UserPermissionService =
    inject<UserPermissionService>(UserPermissionService);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Router used to leave for the intervention workspace, the intervention
   * list and the compliance register.
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
   * Property canReadEquipment
   * @readonly
   *
   * @description
   * Indicates whether the equipment status donut can be rendered.
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
   * Indicates whether inspection-driven cards (non-conformities trend and
   * metric cell, inspections trend, severity bars, result donut) can be
   * rendered.
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
   * Property canReadInterventions
   * @readonly
   *
   * @description
   * Indicates whether the open-interventions metric cell and the upcoming
   * interventions card can be rendered. Gated on the interventions read
   * permission alone (not the dashboard permission), because the backend
   * scopes both the embedded section and the collection endpoint to
   * `organization.interventions.read`.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadInterventions: Signal<boolean> = computed<boolean>(() =>
    this.organizationPermissionService.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_READ),
  );

  /**
   * Property canReadCompliance
   * @readonly
   *
   * @description
   * Indicates whether the compliance-fed surfaces (compliance-rate and
   * equipment-due-soon metric cells, "Compliance by site" card) can be
   * rendered. Gated on the compliance read permission alone because the
   * summary endpoint requires `organization.compliance.read` in its own
   * right.
   *
   * @access protected
   * @since 1.4.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadCompliance: Signal<boolean> = computed<boolean>(() =>
    this.organizationPermissionService.hasPermission(ORGANIZATION_PERMISSION.COMPLIANCE_READ),
  );

  /**
   * Property canReadAudit
   * @readonly
   *
   * @description
   * Indicates whether the "Recent activity" feed can be rendered. Gated on
   * the **global** `audit.read` permission — the ledger endpoint is
   * platform-wide, exactly like the audit log page.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadAudit: Signal<boolean> = computed<boolean>(() =>
    this.userPermissionService.hasPermission(ACCOUNT_PERMISSION.AUDIT_READ),
  );

  /**
   * Property overdueInterventionsNote
   * @readonly
   *
   * @description
   * "N overdue" under the open-interventions figure, or null when none are
   * late. Lateness is a second fact about the same population, not a
   * period-over-period delta, so it does not go in the comparison slot.
   *
   * @access protected
   * @since 1.4.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly overdueInterventionsNote: Signal<string | null> = computed<string | null>(
    () => {
      const overdue = this.store.overdueInterventionCount();
      return typeof overdue === 'number' && overdue > 0
        ? $localize`:@@org.dash.overdueInterventions:${overdue}:count: overdue`
        : null;
    },
  );

  /**
   * Property complianceRateValue
   * @readonly
   *
   * @description
   * Organization-wide compliance rate as a percent string, or null while
   * nothing is tracked — "no schedule yet" must not render as "0%".
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly complianceRateValue: Signal<string | null> = computed<string | null>(() => {
    const rate: number | null = this.complianceStore.rollup().complianceRate;
    return rate !== null ? `${Math.round(rate)}%` : null;
  });

  /**
   * Property openNonConformityCount
   * @readonly
   *
   * @description
   * Open non-conformities across every severity, summed from the dashboard
   * payload's severity breakdown.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly openNonConformityCount: Signal<number> = computed<number>(() =>
    this.store
      .nonConformitiesBySeverity()
      .reduce((sum: number, bucket: { readonly count: number }): number => sum + bucket.count, 0),
  );

  /**
   * Property criticalNonConformitiesNote
   * @readonly
   *
   * @description
   * "N critical" under the open non-conformities figure — the bucket that
   * decides tonight's priorities.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly criticalNonConformitiesNote: Signal<string> = computed<string>(() => {
    const critical: number =
      this.store
        .nonConformitiesBySeverity()
        .find(
          (bucket: { readonly severity: string; readonly count: number }) =>
            bucket.severity === 'critical',
        )?.count ?? 0;

    return $localize`:@@org.dash.criticalNc:${critical}:count: critical`;
  });

  /**
   * Property equipmentDueSoonCount
   * @readonly
   *
   * @description
   * Equipment whose next maintenance falls due soon, from the compliance
   * rollup.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly equipmentDueSoonCount: Signal<number> = computed<number>(
    () => this.complianceStore.rollup().dueSoonEquipmentCount,
  );

  /**
   * Property complianceLoadParams
   * @readonly
   *
   * @description
   * Organization id forwarded to the compliance summary query, or `null`
   * while its surfaces are not visible to the member — no permission means
   * no fetch.
   *
   * @access private
   * @since 1.4.0
   *
   * @type {Signal<string | null>}
   */
  private readonly complianceLoadParams: Signal<string | null> = computed<string | null>(() =>
    this.canReadCompliance() ? (this.store.loadParams() ?? null) : null,
  );

  /**
   * Property upcomingLoadParams
   * @readonly
   *
   * @description
   * Organization id forwarded to the upcoming interventions query, or
   * `null` while the card is not visible to the member.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {Signal<string | null>}
   */
  private readonly upcomingLoadParams: Signal<string | null> = computed<string | null>(() =>
    this.canReadInterventions() ? (this.store.loadParams() ?? null) : null,
  );

  /**
   * Property activityLoadGate
   * @readonly
   *
   * @description
   * `true` once the recent-activity feed may fetch: the member holds
   * `audit.read` and the browser-side organization context is resolved (the
   * ledger query itself is organization-agnostic — see the slice's JSDoc).
   *
   * @access private
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  private readonly activityLoadGate: Signal<boolean> = computed<boolean>(
    () => this.canReadAudit() && this.store.loadParams() !== undefined,
  );

  /**
   * Property hasMetricCells
   * @readonly
   *
   * @description
   * Indicates whether at least one metric-strip cell survives its
   * permission gate.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasMetricCells: Signal<boolean> = computed<boolean>(
    () => this.canReadInterventions() || this.canReadCompliance() || this.canReadInspections(),
  );

  /**
   * Property hasChartCards
   * @readonly
   *
   * @description
   * Indicates whether the chart grid contains at least one visible card.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasChartCards: Signal<boolean> = computed<boolean>(
    () => this.canReadInspections() || this.canReadEquipment(),
  );

  /**
   * Property showDashboard
   * @readonly
   *
   * @description
   * Indicates whether any dashboard module is visible; otherwise the
   * no-access empty state renders alone.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly showDashboard: Signal<boolean> = computed<boolean>(
    () =>
      this.hasMetricCells() ||
      this.hasChartCards() ||
      this.canReadInterventions() ||
      this.canReadCompliance() ||
      this.canReadAudit(),
  );

  //#endregion

  //#region Lifecycle

  /**
   * Wires the permission-gated queries to their reactive parameters: each
   * runs only while its surface is visible to the member, and re-runs when
   * the active organization changes.
   *
   * @since 1.4.0
   */
  public constructor() {
    this.complianceStore.load(this.complianceLoadParams);
    this.upcomingStore.load(this.upcomingLoadParams);
    this.activityStore.load(this.activityLoadGate);
  }

  //#endregion

  //#region Methods

  /**
   * Method openIntervention
   *
   * @description
   * Routes into the intervention workspace for the row activated in the
   * upcoming interventions card.
   *
   * @access protected
   * @since 1.3.0
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
   * Method openInterventionList
   *
   * @description
   * Leaves for the full intervention list from the upcoming card's
   * "View all interventions" link.
   *
   * @access protected
   * @since 1.4.0
   *
   * @returns {void}
   */
  protected openInterventionList(): void {
    const organizationId: string | undefined = this.store.loadParams();
    if (!organizationId) return;

    void this.router.navigate(['/organizations', organizationId, 'interventions']);
  }

  /**
   * Method retryUpcoming
   *
   * @description
   * Re-runs the upcoming interventions query after a failure surfaced by
   * the card.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected retryUpcoming(): void {
    this.upcomingStore.load(this.store.loadParams() ?? null);
  }

  /**
   * Method retryActivity
   *
   * @description
   * Re-runs the recent activity query after a failure surfaced by the feed.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected retryActivity(): void {
    this.activityStore.load(this.canReadAudit());
  }

  /**
   * Method openCompliance
   *
   * @description
   * Routes into the full compliance register from the "Compliance by
   * site" card.
   *
   * @access protected
   * @since 1.4.0
   *
   * @returns {void}
   */
  protected openCompliance(): void {
    const organizationId: string | undefined = this.store.loadParams();
    if (!organizationId) return;

    void this.router.navigate(['/organizations', organizationId, 'compliance']);
  }

  /**
   * Method retryCompliance
   *
   * @description
   * Re-runs the compliance summary query after a failure surfaced by the
   * "Compliance by site" card.
   *
   * @access protected
   * @since 1.4.0
   *
   * @returns {void}
   */
  protected retryCompliance(): void {
    this.complianceStore.load(this.store.loadParams() ?? null);
  }

  //#endregion
}
