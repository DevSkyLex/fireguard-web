import type { Routes } from '@angular/router';
import { DASHBOARD_MOBILE_NAVIGATION_ROOT_DATA_KEY, type DashboardRouteData } from '@core/routing';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { unsavedChangesGuard } from '@shared/unsaved-changes';

/**
 * Constant MAINTENANCE_EXPORT_ROUTES
 *
 * @description
 * Permission-gated archive workspace keeps its private reads browser-only.
 */
export const MAINTENANCE_EXPORT_ROUTES: Routes = [
  {
    path: '',
    canDeactivate: [unsavedChangesGuard],
    canActivate: [
      organizationPermissionGuard({
        permissions: [ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_READ],
      }),
    ],
    loadComponent: () =>
      import('./ui/pages/maintenance-exports-page/maintenance-exports-page.component').then(
        (module) => module.MaintenanceExportsPage,
      ),
    title: $localize`:@@route.maintenanceExports:Maintenance exports`,
    data: {
      breadcrumb: $localize`:@@route.maintenanceExports:Maintenance exports`,
      [DASHBOARD_MOBILE_NAVIGATION_ROOT_DATA_KEY]: true,
    } satisfies DashboardRouteData,
  },
];
