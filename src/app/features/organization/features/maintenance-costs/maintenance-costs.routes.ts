import type { Routes } from '@angular/router';
import { DASHBOARD_MOBILE_NAVIGATION_ROOT_DATA_KEY, type DashboardRouteData } from '@core/routing';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';

/**
 * Constant MAINTENANCE_COST_ROUTES
 *
 * @description
 * A dedicated private financial workspace optionally scoped by the interventionId query parameter.
 */
export const MAINTENANCE_COST_ROUTES: Routes = [
  {
    path: 'reports',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ] }),
    ],
    loadComponent: () =>
      import('./ui/pages/maintenance-reports-page/maintenance-reports-page.component').then(
        (module) => module.MaintenanceReportsPage,
      ),
    title: $localize`:@@route.maintenanceReports:Economic pilotage`,
    data: {
      breadcrumb: $localize`:@@route.maintenanceReports:Economic pilotage`,
      [DASHBOARD_MOBILE_NAVIGATION_ROOT_DATA_KEY]: true,
    } satisfies DashboardRouteData,
  },
  {
    path: '',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ] }),
    ],
    loadComponent: () =>
      import('./ui/pages/maintenance-costs-page/maintenance-costs-page.component').then(
        (module) => module.MaintenanceCostsPage,
      ),
    title: $localize`:@@route.maintenanceCosts:Maintenance costs`,
    data: {
      breadcrumb: $localize`:@@route.maintenanceCosts:Maintenance costs`,
      [DASHBOARD_MOBILE_NAVIGATION_ROOT_DATA_KEY]: true,
    } satisfies DashboardRouteData,
  },
];
