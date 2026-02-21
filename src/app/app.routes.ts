import type { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth';
import { noOrganizationGuard } from '@core/guards/no-organization';
import { organizationGuard } from '@core/guards/organization';
import { SplitLayout } from './layouts/split-layout';
import { DashboardLayout } from './layouts/dashboard-layout';

/**
 * Constant APP_ROUTES
 *
 * @description
 * Application root routes configuration.
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
    path: '',
    component: DashboardLayout,
    canActivate: [authGuard, organizationGuard],
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
];


