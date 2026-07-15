import type { Routes } from '@angular/router';

/**
 * Constant MAIN_ROUTES
 *
 * @description
 * Routes for the main feature module.
 *
 * The application root (`/`) has no standalone landing page: FireGuard is
 * organization-scoped, so the root redirects to the organizations entry point,
 * which forwards to the active organization's workspace.
 *
 * @since 1.0.0
 */
export const MAIN_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: '/organizations',
  },
];
