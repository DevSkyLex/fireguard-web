import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
  protected readonly store: DashboardStore = inject<DashboardStore>(
    DashboardStore,
  );

  //#endregion
}
