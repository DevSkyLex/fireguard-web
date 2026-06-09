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
    path: 'profile',
    loadComponent: () =>
      import('./ui/pages/profile-page/profile-page.component').then((m) => m.ProfilePage),
    title: 'Profile',
    data: {
      breadcrumb: 'Profile',
      preload: true,
    },
  },
  {
    path: 'sessions',
    loadComponent: () =>
      import('./ui/pages/sessions-page/sessions-page.component').then((m) => m.SessionsPage),
    title: 'Sessions',
    data: {
      breadcrumb: 'Sessions',
      preload: true,
    },
  },
  {
    path: 'trusted-devices',
    loadComponent: () =>
      import('./ui/pages/trusted-devices-page/trusted-devices-page.component').then(
        (m) => m.TrustedDevicesPage,
      ),
    title: 'Trusted Devices',
    data: {
      breadcrumb: 'Trusted Devices',
      preload: true,
    },
  },
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
    redirectTo: 'profile',
    pathMatch: 'full',
  },
];
