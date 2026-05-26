import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { OrganizationPermissionService } from '@features/organization/access/services/organization-permission/organization-permission.service';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { DashboardStore } from '@features/organization/state/organization-dashboard';
import { MetricCard } from '@shared/components';
import {
  AssetGrowthTrend,
  InspectionQualityTrend,
  NonConformitiesResolvedTrend,
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
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dashboard',
  templateUrl: './organization-dashboard.component.html',
  imports: [
    MetricCard,
    OverviewTrend,
    InspectionQualityTrend,
    NonConformitiesOpenedTrend,
    NonConformitiesResolvedTrend,
    AssetGrowthTrend,
  ],
  providers: [DashboardStore],
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
  protected readonly canReadFacilities: Signal<boolean> = computed<boolean>(() =>
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
  protected readonly canReadMembers: Signal<boolean> = computed<boolean>(() =>
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
  protected readonly canReadEquipment: Signal<boolean> = computed<boolean>(() =>
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
  protected readonly canReadInspections: Signal<boolean> = computed<boolean>(() =>
    this.canReadDashboard() ||
    this.organizationPermissionService.hasPermission(ORGANIZATION_PERMISSION.INSPECTION_READ),
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
    () => this.hasActivityMetrics() || this.hasActivityInsights(),
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
}
