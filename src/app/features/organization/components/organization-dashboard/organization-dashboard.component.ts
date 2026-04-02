import { ChangeDetectionStrategy, Component } from '@angular/core';
import { OrganizationDashboardInspectionsTrend } from './organization-dashboard-inspections-trend/organization-dashboard-inspections-trend.component';
import { OrganizationDashboardNonConformitiesOpenedTrend } from './organization-dashboard-non-conformities-opened-trend/organization-dashboard-non-conformities-opened-trend.component';
import { OrganizationDashboardNonConformitiesResolvedTrend } from './organization-dashboard-non-conformities-resolved-trend/organization-dashboard-non-conformities-resolved-trend.component';
import { OrganizationDashboardOverviewTrend } from './organization-dashboard-overview-trend/organization-dashboard-overview-trend.component';
/**
 * Component OrganizationDashboard
 * @class OrganizationDashboard
 *
 * @description
 * Smart dashboard component for the organization overview page.
 * Injects the ActiveOrganizationStore and connects the three trend
 * components to their respective data and loading states.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dashboard',
  templateUrl: './organization-dashboard.component.html',
  imports: [
    OrganizationDashboardOverviewTrend,
    OrganizationDashboardInspectionsTrend,
    OrganizationDashboardNonConformitiesOpenedTrend,
    OrganizationDashboardNonConformitiesResolvedTrend,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDashboard {}

