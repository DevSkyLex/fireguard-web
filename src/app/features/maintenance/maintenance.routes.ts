import type { Routes } from '@angular/router';

/**
 * Routes MAINTENANCE_ROUTES
 *
 * @description
 * Lazy-loaded routes for the maintenance feature.
 * No auth or onboarding guards — always accessible.
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
    title: $localize`:@@route.maintenance:Under maintenance`,
  },
];
