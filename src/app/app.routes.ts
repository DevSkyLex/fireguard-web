import type { Routes } from '@angular/router';
import { authGuard } from '@features/auth/http/guards';
import { onboardingGuard } from '@features/onboarding/http/guards';
import { DashboardLayout } from './layouts/dashboard-layout';
import { FocusedLayout } from './layouts/focused-layout';
import { SplitLayout } from './layouts/split-layout';

/**
 * Constant APP_ROUTES
 *
 * @description
 * Application root routes configuration.
 *
 * The root path (`/`) serves the home page.
 * Organization-scoped pages live under `/organizations/:organizationId`.
 */
export const APP_ROUTES: Routes = [
  {
    path: '',
    component: DashboardLayout,
    canActivate: [authGuard, onboardingGuard],
    data: {
      breadcrumb: false,
    },
    loadChildren: () => import('@features/main/main.routes').then((m) => m.MAIN_ROUTES),
  },
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
    component: FocusedLayout,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadChildren: () =>
          import('@features/onboarding/onboarding.routes').then((m) => m.ONBOARDING_ROUTES),
      },
    ],
  },
  {
    path: 'organizations',
    component: DashboardLayout,
    canActivate: [authGuard, onboardingGuard],
    data: {
      breadcrumb: 'Organizations',
    },
    loadChildren: () =>
      import('@features/organization/organization.routes').then((m) => m.ORGANIZATION_ROUTES),
  },
  {
    path: 'account',
    component: DashboardLayout,
    canActivate: [authGuard, onboardingGuard],
    children: [
      {
        path: '',
        loadChildren: () =>
          import('@features/account/account.routes').then((m) => m.ACCOUNT_ROUTES),
      },
    ],
  },
];
