import type { Routes } from '@angular/router';

/**
 * Routes ERROR_ROUTES
 *
 * @description
 * Lazy-loaded routes for the error feature.
 * Each route maps to a dedicated error page component.
 * No auth or onboarding guards are applied — error pages
 * must always be accessible.
 *
 * @since 1.0.0
 *
 * @type {Routes}
 */
export const ERROR_ROUTES: Routes = [
  {
    path: '404',
    loadComponent: () =>
      import('./ui/pages/not-found-page/not-found-page.component').then((m) => m.NotFoundPage),
    title: $localize`:@@route.error.notFound:Page not found`,
  },
  {
    path: '403',
    loadComponent: () =>
      import('./ui/pages/forbidden-page/forbidden-page.component').then((m) => m.ForbiddenPage),
    title: $localize`:@@route.error.forbidden:Access denied`,
  },
  {
    path: '500',
    loadComponent: () =>
      import('./ui/pages/server-error-page/server-error-page.component').then(
        (m) => m.ServerErrorPage,
      ),
    title: $localize`:@@route.error.serverError:Server error`,
  },
  {
    path: '**',
    redirectTo: '404',
  },
];
