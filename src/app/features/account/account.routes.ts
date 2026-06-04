import type { Routes } from '@angular/router';

/**
 * Constant ACCOUNT_ROUTES
 *
 * @description
 * Routes for the account feature module (user account management area).
 *
 * @since 1.0.0
 */
export const ACCOUNT_ROUTES: Routes = [
  {
    path: 'notifications',
    loadComponent: () =>
      import('./ui/pages/notification-center-page/notification-center-page.component').then(
        (m) => m.NotificationCenterPage,
      ),
    title: 'Notification Center',
    data: {
      breadcrumb: 'Notifications',
      preload: true,
    },
  },
  {
    path: '',
    redirectTo: 'notifications',
    pathMatch: 'full',
  },
];
