import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { Router } from '@angular/router';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  ComplianceSummaryStore,
  type ComplianceSummaryStoreType,
} from '@features/organization/features/compliance/state';
import {
  ORGANIZATION_PERMISSION,
  type OrganizationDashboardRecentIntervention,
} from '@features/organization/models';
import { DashboardStore } from '@features/organization/state/organization-dashboard';
import { EmptyState, Skeleton } from '@shared/components';
import {
  AssetGrowthTrend,
  EquipmentCreatedTrend,
  FacilitiesCreatedTrend,
  ComplianceBySite,
  DashboardMetricCell,
  DashboardMetricStrip,
  DashboardRecentInterventions,
  InspectionQualityTrend,
  InspectionsTrend,
  NonConformitiesResolvedTrend,
  EquipmentStatusBreakdown,
  InspectionResultBreakdown,
  NonConformitiesBySeverity,
  NonConformitiesOpenedTrend,
  OverviewTrend,
} from './components';

/**
 * Component OrganizationDashboard
 * @class OrganizationDashboard
 *
 * @description
 * Smart dashboard component for the organization overview page.
 * Delegates data fetching and KPI derivation to `OrganizationDashboardStore`.
 * Child trend components handle their own independent data requests
 * and are mounted below the summary row.
 *
 * @version 1.4.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dashboard',
  templateUrl: './organization-dashboard.component.html',
  imports: [
    DashboardMetricStrip,
    DashboardMetricCell,
    DashboardRecentInterventions,
    OverviewTrend,
    InspectionQualityTrend,
    InspectionsTrend,
    EquipmentStatusBreakdown,
    InspectionResultBreakdown,
    NonConformitiesBySeverity,
    NonConformitiesOpenedTrend,
    NonConformitiesResolvedTrend,
    ComplianceBySite,
    AssetGrowthTrend,
    EquipmentCreatedTrend,
    FacilitiesCreatedTrend,
    Skeleton,
    EmptyState,
  ],
  providers: [DashboardStore, ComplianceSummaryStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDashboard {
  //#region Properties

  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped store that owns the aggregate `/dashboard` fetch,
   * KPI derivation and comparison delta computation.
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
   * "Compliance by site" card with the worst-first per-site breakdown.
   *
   * @access protected
   * @since 1.4.0
   *
   * @type {ComplianceSummaryStoreType}
   */
  protected readonly complianceStore: ComplianceSummaryStoreType =
    inject<ComplianceSummaryStoreType>(ComplianceSummaryStore);

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
   * Property canReadFacilities
   * @readonly
   *
   * @description
   * Indicates whether facilities metrics and resource trends can be rendered.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadFacilities: Signal<boolean> = computed<boolean>(
    () =>
      this.canReadDashboard() ||
      this.organizationPermissionService.hasPermission(ORGANIZATION_PERMISSION.FACILITIES_READ),
  );

  /**
   * Property canReadMembers
   * @readonly
   *
   * @description
   * Indicates whether member metrics can be rendered.
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
   * Indicates whether equipment metrics and resource trends can be rendered.
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
   * Indicates whether inspection metrics and inspection-driven trends can be rendered.
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
   * Property canReadCompliance
   * @readonly
   *
   * @description
   * Indicates whether the "Compliance by site" card can be rendered. Gated
   * on the compliance read permission alone (not the dashboard permission),
   * because the compliance summary endpoint requires
   * `organization.compliance.read` in its own right.
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
   * Property complianceLoadParams
   * @readonly
   *
   * @description
   * Organization id forwarded to the compliance summary query, or `null`
   * while the card is not visible to the member — no permission means no
   * fetch, and the query starts only once the card actually renders.
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
   * Property hasActivityMetrics
   * @readonly
   *
   * @description
   * Indicates whether at least one activity KPI card can be rendered.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasActivityMetrics: Signal<boolean> = computed<boolean>(
    () =>
      this.canReadFacilities() ||
      this.canReadMembers() ||
      this.canReadEquipment() ||
      this.canReadInspections(),
  );

  /**
   * Property hasActivityInsights
   * @readonly
   *
   * @description
   * Indicates whether at least one activity trend card can be rendered.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasActivityInsights: Signal<boolean> = computed<boolean>(() =>
    this.canReadInspections(),
  );

  /**
   * Property showActivitySection
   * @readonly
   *
   * @description
   * Indicates whether the activity section contains at least one visible block.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly showActivitySection: Signal<boolean> = computed<boolean>(
    () =>
      this.hasActivityMetrics() ||
      this.hasActivityInsights() ||
      this.canReadRecentInterventions() ||
      this.canReadCompliance(),
  );

  /**
   * Property showResourcesSection
   * @readonly
   *
   * @description
   * Indicates whether the resource section contains at least one visible block.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly showResourcesSection: Signal<boolean> = computed<boolean>(
    () => this.canReadFacilities() || this.canReadEquipment(),
  );

  //#endregion

  //#region Lifecycle

  /**
   * Wires the compliance summary query to its reactive parameters: the
   * query runs only while the member can see the card, and re-runs when
   * the active organization changes.
   *
   * @since 1.4.0
   */
  public constructor() {
    this.complianceStore.load(this.complianceLoadParams);
  }

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
