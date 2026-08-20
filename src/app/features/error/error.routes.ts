import type { Routes } from '@angular/router';

/**
 * Routes ERROR_ROUTES
 *
 * @description
 * Lazy-loaded routes for the error feature. Each route maps to a dedicated
 * error page. No auth or onboarding guard applies here: an error page must stay
 * reachable in exactly the states that produce one.
 *
 * `403` and `500` are where `organizationGuard` sends a member whose every
 * organization is excluded, respectively whose workspace resolution failed on
 * transport. Anything else under `/error` falls through to not-found, which is
 * the honest answer for an address this feature does not serve.
 *
 * @since 1.0.0
 *
 * @type {Routes}
 */
export const ERROR_ROUTES: Routes = [
  {
    path: '403',
    loadComponent: () =>
      import('./ui/pages/forbidden-page/forbidden-page.component').then((m) => m.ForbiddenPage),
    title: $localize`:@@route.forbidden:Access denied`,
  },
  {
    path: '500',
    loadComponent: () =>
      import('./ui/pages/server-error-page/server-error-page.component').then(
        (m) => m.ServerErrorPage,
      ),
    title: $localize`:@@route.serverError:Something went wrong`,
  },
  {
    path: '404',
    loadComponent: () =>
      import('./ui/pages/not-found-page/not-found-page.component').then((m) => m.NotFoundPage),
    title: $localize`:@@route.notFound:Page not found`,
  },
  { path: '**', redirectTo: '404' },
];
