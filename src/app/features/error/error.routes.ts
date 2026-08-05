import type { Routes } from '@angular/router';

/**
 * Routes ERROR_ROUTES
 *
 * @description
 * Lazy-loaded routes for the error feature. Each route maps to a dedicated
 * error page. No auth or onboarding guard applies here: an error page must stay
 * reachable in exactly the states that produce one.
 *
 * Only `404` is mounted today. Further codes get their own path as their pages
 * land; until then anything else under `/error` falls through to not-found,
 * which is the honest answer for an address this feature does not serve.
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
    title: $localize`:@@route.notFound:Page not found`,
  },
  { path: '**', redirectTo: '404' },
];
