import type { Routes } from '@angular/router';

/**
 * Constant MAIN_ROUTES
 *
 * @description
 * Routes for the main feature module (authenticated area).
 *
 * @since 1.0.0
 */
export const MAIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home-page/home-page.component').then((m) => m.HomePage),
    title: 'Home',
  },
];
