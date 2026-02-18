import type { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth';
import { onboardingCompletedGuard } from '@features/organization/guards';
import { SplitLayout } from './layouts/split-layout';
import { FocusedLayout } from './layouts/focused-layout';
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
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadChildren: () =>
          import('@features/organization/organization.routes').then(
            (m) => m.ORGANIZATION_ROUTES,
          ),
      },
    ],
  },
  {
    path: '',
    component: DashboardLayout,
    canActivate: [authGuard, onboardingCompletedGuard],
    children: [
      {
        path: '',
        loadChildren: () => import('@features/main/main.routes').then((m) => m.MAIN_ROUTES),
      },
    ],
  },
];


