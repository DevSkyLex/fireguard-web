import type { Routes } from '@angular/router';
import { authGuard } from '@core/guards';
import { AuthLayout } from './layouts/auth-layout';

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
        loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
      },
    ],
  },
  {
    path: 'home',
    loadComponent: () => import('./features/main/pages/home-page/home-page.component').then((m) => m.HomePage),
    canActivate: [authGuard],
    title: 'Home',
  },
];
