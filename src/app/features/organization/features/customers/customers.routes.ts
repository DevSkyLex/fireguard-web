import type { Routes } from '@angular/router';
import { DASHBOARD_MOBILE_NAVIGATION_ROOT_DATA_KEY, type DashboardRouteData } from '@core/routing';

/**
 * Constant CUSTOMER_ROUTES
 *
 * @description
 * Organization owns the entry permission guard; customers own their directory route.
 *
 * @since unreleased
 */
export const CUSTOMER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./ui/pages/customers-page/customers-page.component').then(
        (module) => module.CustomersPage,
      ),
    title: $localize`:@@route.customers:Customers`,
    data: {
      breadcrumb: $localize`:@@route.customers:Customers`,
      [DASHBOARD_MOBILE_NAVIGATION_ROOT_DATA_KEY]: true,
    } satisfies DashboardRouteData,
  },
];
