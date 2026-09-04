import type { Routes } from '@angular/router';

/**
 * Routes MAINTENANCE_ROUTES
 *
 * @description
 * Lazy-loaded routes for the maintenance feature.
 * No auth or onboarding guards — always accessible.
 *
 * `maintenanceGuard` and `maintenanceInterceptor` both navigate here, so the
 * page has to stay reachable in exactly the state that produces it: an API
 * that is answering 503, or none at all.
 *
 * @since 1.0.0
 *
 * @type {Routes}
 */
export const MAINTENANCE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./ui/pages/maintenance-page/maintenance-page.component').then(
        (m) => m.MaintenancePage,
      ),
    title: $localize`:@@route.maintenanceMode:Under maintenance`,
  },
];
