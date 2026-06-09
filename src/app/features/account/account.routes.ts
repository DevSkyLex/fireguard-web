import { inject } from '@angular/core';
import { Router, type Routes } from '@angular/router';

/**
 * Constant ACCOUNT_ROUTES
 *
 * @description
 * Routes for the account feature module (user account management area).
 *
 * The feature now exposes a single page at `/account` presenting the profile,
 * security and notifications sections in a tab layout. The former per-section
 * routes are kept as backward-compatible redirects that deep-link into the
 * matching tab via the `tab` query parameter.
 *
 * @since 1.0.0
 */
export const ACCOUNT_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./ui/pages/account-page/account-page.component').then((m) => m.AccountPage),
    title: 'Account',
    data: {
      breadcrumb: 'Account',
      preload: true,
    },
  },
  // Backward-compatible redirects from the former per-section routes.
  {
    path: 'profile',
    redirectTo: (): ReturnType<Router['parseUrl']> =>
      inject(Router).parseUrl('/account?tab=profile'),
  },
  {
    path: 'sessions',
    redirectTo: (): ReturnType<Router['parseUrl']> =>
      inject(Router).parseUrl('/account?tab=security'),
  },
  {
    path: 'trusted-devices',
    redirectTo: (): ReturnType<Router['parseUrl']> =>
      inject(Router).parseUrl('/account?tab=security'),
  },
  {
    path: 'notifications',
    redirectTo: (): ReturnType<Router['parseUrl']> =>
      inject(Router).parseUrl('/account?tab=notifications'),
  },
];
