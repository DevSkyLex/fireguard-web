import type { Routes } from '@angular/router';
import { authGuard } from '@features/auth/http/guards';
import { maintenanceGuard } from '@features/maintenance/http/guards';
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
    canActivate: [authGuard, onboardingGuard, maintenanceGuard],
    children: [
      {
        path: '',
        data: { breadcrumb: false },
        loadChildren: () => import('@features/main/main.routes').then((m) => m.MAIN_ROUTES),
      },
      {
        path: 'organizations',
        data: { breadcrumb: 'Organizations' },
        loadChildren: () =>
          import('@features/organization/organization.routes').then((m) => m.ORGANIZATION_ROUTES),
      },
      {
        path: 'account',
        loadChildren: () =>
          import('@features/account/account.routes').then((m) => m.ACCOUNT_ROUTES),
      },
    ],
  },
  {
    path: 'auth',
    component: SplitLayout,
    loadChildren: () => import('@features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    component: FocusedLayout,
    children: [
      {
        path: 'onboarding',
        canActivate: [authGuard, maintenanceGuard],
        loadChildren: () =>
          import('@features/onboarding/onboarding.routes').then((m) => m.ONBOARDING_ROUTES),
      },
      {
        path: 'error',
        loadChildren: () => import('@features/error/error.routes').then((m) => m.ERROR_ROUTES),
      },
      {
        path: 'maintenance',
        loadChildren: () =>
          import('@features/maintenance/maintenance.routes').then((m) => m.MAINTENANCE_ROUTES),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'error/404',
  },
];
