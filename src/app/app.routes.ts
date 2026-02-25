import type { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth';
import { noOrganizationGuard } from '@core/guards/no-organization';
import { organizationGuard } from '@core/guards/organization';
import { organizationResolver } from '@core/resolvers';
import { SplitLayout } from './layouts/split-layout';
import { DashboardLayout } from './layouts/dashboard-layout';

/**
 * Constant APP_ROUTES
 *
 * @description
 * Application root routes configuration.
 *
 * The dashboard lives under `organizations/:organizationId` so every
 * child route is automatically scoped to the active organization.
 * The root path (`/`) redirects to the first available organization
 * via {@link organizationGuard}.
 */
export const APP_ROUTES: Routes = [
  {
    path: 'auth',
    component: SplitLayout,
    children: [
      {
        path: '',
        loadChildren: () => import('@features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
      },
    ],
  },
  {
    path: 'onboarding',
    component: SplitLayout,
    canActivate: [authGuard, noOrganizationGuard],
    children: [
      {
        path: '',
        loadChildren: () =>
          import('@features/onboarding/onboarding.routes').then(
            (m) => m.ONBOARDING_ROUTES,
          ),
      },
    ],
  },
  {
    path: 'organizations/:organizationId',
    component: DashboardLayout,
    canActivate: [authGuard],
    resolve: { organization: organizationResolver },
    children: [
      {
        path: '',
        loadChildren: () => import('@features/main/main.routes').then((m) => m.MAIN_ROUTES),
      },
      {
        path: 'account',
        loadChildren: () =>
          import('@features/account/account.routes').then((m) => m.ACCOUNT_ROUTES),
      },
    ],
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [authGuard, organizationGuard],
    children: [],
  },
];


