import type { Routes } from '@angular/router';
import { authGuard } from '@core/guards';
import { AuthLayout } from './layouts/auth-layout';
import { DashboardLayout } from './layouts/dashboard-layout';

/**
 * Constant routes
 *
 * @description
 * Application root routes configuration.
 *
 * @since 1.0.0
 */
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: '',
    component: AuthLayout,
    children: [
      {
        path: 'auth',
        loadChildren: () => import('@features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
      },
    ],
  },
  {
    path: '',
    component: DashboardLayout,
    children: [
      {
        path: '',
        loadChildren: () => import('@features/main/main.routes').then((m) => m.MAIN_ROUTES),
      }
    ],
  }
];
