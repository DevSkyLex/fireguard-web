import { computed, inject } from '@angular/core';
import { PrimeIcons, type MenuItem } from 'primeng/api';
import { NOTIFICATION_CENTER_PORT } from '@features/account/ports';
import type { NotificationCenterPort } from '@features/account/ports';
import { SIDEBAR_NAVIGATION_SLOT } from '@layouts/dashboard-layout/slots/sidebar-navigation';
import type { AccountFeature } from '../../account.feature';

/**
 * Feature withAccountNavigation
 *
 * @description
 * Registers the account section in the dashboard sidebar navigation slot.
 * Contributes an "Account" group containing the Notifications link, with a
 * reactive badge driven by the `NotificationCenterPort` signal.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * provideAccountFeature(withAccountNavigation())
 * ```
 */
export function withAccountNavigation(): AccountFeature {
  return {
    providers: [
      {
        provide: SIDEBAR_NAVIGATION_SLOT,
        useFactory: () => {
          /**
           * Constant notificationCenter
           * @const notificationCenter
           *
           * @description
           * Local constant to read the notification center port once and
           * avoid injecting it multiple times in the computed `section`
           * callback below, which would be inefficient and potentially
           * cause issues with circular dependencies.
           *
           * @type {NotificationCenterPort}
           */
          const notificationCenter: NotificationCenterPort =
            inject<NotificationCenterPort>(NOTIFICATION_CENTER_PORT);

          // Return the contribution object implementing the contract.
          return {
            id: 'account',
            order: 30,
            section: computed<MenuItem>(() => {
              /**
               * Constant badge
               * @const badge
               *
               * @description
               * Local constant to compute the badge value for the notifications menu item.
               * Displays the unread count if there are unread notifications,
               * otherwise undefined.
               *
               * @type {string | undefined}
               */
              const badge: string | undefined = notificationCenter.hasUnread()
                ? String(notificationCenter.unreadCount())
                : undefined;

              // Return the "Account" section with the "Notifications" item,
              // including the reactive badge.
              return {
                id: 'account',
                label: 'Account',
                expanded: true,
                items: [
                  {
                    id: 'notifications',
                    label: 'Notifications',
                    icon: PrimeIcons.BELL,
                    routerLink: '/account/notifications',
                    badge: badge,
                  },
                ],
              };
            }),
          };
        },
        multi: true,
      },
    ],
  };
}
