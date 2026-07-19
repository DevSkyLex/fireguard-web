import { type Routes } from '@angular/router';

/**
 * Constant ACCOUNT_ROUTES
 *
 * @description
 * Routes for the account feature module (user account management area).
 *
 * The feature exposes a single page at `/account` presenting the profile,
 * security and notifications sections in a tab layout, selected through the
 * `tab` query parameter.
 *
 * @since 1.0.0
 */
export const ACCOUNT_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./ui/pages/account-page/account-page.component').then((m) => m.AccountPage),
    title: $localize`:@@route.account:Account`,
    data: {
      breadcrumb: $localize`:@@route.account:Account`,
      preload: true,
    },
  },
  /**
   * The unified inbox lives under the account, not an organization: an item's
   * `organizationId` is optional, so account-level entries have no organization
   * to be nested under.
   */
  {
    path: 'inbox',
    loadComponent: () => import('./ui/pages/inbox').then((m) => m.InboxPage),
    title: $localize`:@@route.inbox:Inbox`,
    data: {
      breadcrumb: $localize`:@@route.inbox:Inbox`,
      description: 'Mentions, assignments and alerts from every organization.',
    },
  },
];
