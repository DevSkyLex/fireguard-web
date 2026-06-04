import type { Routes } from '@angular/router';

/**
 * Constant MAIN_ROUTES
 *
 * @description
 * Routes for the main feature module.
 *
 * - `/home` — application home page (dashboard landing)
 *
 * @since 1.0.0
 */
export const MAIN_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./ui/pages/home-page/home-page.component').then((m) => m.HomePage),
    title: 'Home',
    data: {
      breadcrumb: false,
      preload: true,
    },
  },
];
