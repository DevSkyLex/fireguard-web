import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { OrganizationDashboardStore } from '@features/organization/state/organization-dashboard';
import { MetricCard } from '@shared/components';
import {
  OrganizationDashboardAssetGrowthTrend,
  OrganizationDashboardInspectionQualityTrend,
  OrganizationDashboardNonConformitiesOpenedTrend,
  OrganizationDashboardNonConformitiesResolvedTrend,
  OrganizationDashboardOverviewTrend,
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
    OrganizationDashboardOverviewTrend,
    OrganizationDashboardInspectionQualityTrend,
    OrganizationDashboardNonConformitiesOpenedTrend,
    OrganizationDashboardNonConformitiesResolvedTrend,
    OrganizationDashboardAssetGrowthTrend,
  ],
  providers: [OrganizationDashboardStore],
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
   * @type {OrganizationDashboardStore}
   */
  protected readonly store: OrganizationDashboardStore = inject<OrganizationDashboardStore>(
    OrganizationDashboardStore,
  );

  //#endregion
}
