import type { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth';
import { AuthLayout } from './layouts/auth-layout';
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
    component: AuthLayout,
    children: [
      {
        path: '',
        loadChildren: () => import('@features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
      },
    ],
  },
  {
    path: '',
    component: DashboardLayout,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadChildren: () => import('@features/main/main.routes').then((m) => m.MAIN_ROUTES),
      },
    ],
  },
];
