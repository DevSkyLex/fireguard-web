import { type Routes } from '@angular/router';

/**
 * Constant ACCOUNT_ROUTES
 *
 * @description
 * The account sections, each a full page in the workspace shell's content
 * column — never a panel beside another page, and never a second shell.
 *
 * They mount inside the one dashboard shell, alongside the organization tree,
 * so opening the account changes the page and nothing else: the sidebar keeps
 * its global navigation, its switcher and the organization block
 * (`app.routes.ts`). Nothing here needs an organization of its own.
 *
 * @since 3.0.0
 */
export const ACCOUNT_ROUTES: Routes = [
  {
    path: 'profile',
    loadComponent: () =>
      import('./ui/pages/account-profile-page/account-profile-page.component').then(
        (m) => m.AccountProfilePage,
      ),
    title: $localize`:@@route.accountProfile:Your account`,
    data: { breadcrumb: $localize`:@@route.accountProfile:Your account` },
  },
  {
    path: 'security',
    loadComponent: () =>
      import('./ui/pages/account-security-page/account-security-page.component').then(
        (m) => m.AccountSecurityPage,
      ),
    title: $localize`:@@route.accountSecurity:Security`,
    data: { breadcrumb: $localize`:@@route.accountSecurity:Security` },
  },
  {
    path: 'organizations',
    loadComponent: () =>
      import('./ui/pages/account-organizations-page/account-organizations-page.component').then(
        (m) => m.AccountOrganizationsPage,
      ),
    title: $localize`:@@route.accountOrganizations:Your organizations`,
    data: { breadcrumb: $localize`:@@route.accountOrganizations:Your organizations` },
  },
  {
    path: 'notifications/preferences',
    loadComponent: () =>
      import('./ui/pages/account-notification-preferences-page/account-notification-preferences-page.component').then(
        (m) => m.AccountNotificationPreferencesPage,
      ),
    title: $localize`:@@route.accountNotificationPreferences:Notification preferences`,
    data: {
      breadcrumb: $localize`:@@route.accountNotificationPreferences:Notification preferences`,
    },
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./ui/pages/account-notifications-page/account-notifications-page.component').then(
        (m) => m.AccountNotificationsPage,
      ),
    title: $localize`:@@route.accountNotifications:Notifications`,
    data: { breadcrumb: $localize`:@@route.accountNotifications:Notifications` },
  },
  { path: '', pathMatch: 'full', redirectTo: 'profile' },
];
