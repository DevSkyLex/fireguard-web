import type { Routes } from '@angular/router';
import { DASHBOARD_MOBILE_NAVIGATION_ROOT_DATA_KEY, type DashboardRouteData } from '@core/routing';

/**
 * Constant WORKLOAD_ROUTES
 * @const WORKLOAD_ROUTES
 *
 * @description
 * Membership-gated own workload; the API independently authorizes team visibility.
 *
 * @since 1.0.0
 */
export const WORKLOAD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./ui/pages/workload-page/workload-page.component').then((m) => m.WorkloadPage),
    title: $localize`:@@route.workload:Workload`,
    data: {
      breadcrumb: $localize`:@@route.workload:Workload`,
      [DASHBOARD_MOBILE_NAVIGATION_ROOT_DATA_KEY]: true,
    } satisfies DashboardRouteData,
  },
];
