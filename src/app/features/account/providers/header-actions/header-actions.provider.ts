import type { AccountFeature } from '@features/account/account.feature';
import { AccountUserMenu } from '@features/account/ui/components/account-user-menu/account-user-menu.component';
import { NotificationBell } from '@features/account/ui/components/notification-bell/notification-bell.component';
import { HEADER_ACTION_SLOT } from '@layouts/dashboard-layout/slots/header-action';

/**
 * Function withAccountHeaderActions
 * @function withAccountHeaderActions
 *
 * @description
 * Registers the {@link NotificationBell} and
 * {@link AccountUserMenu} components into the
 * `HEADER_ACTION_SLOT` extension point.
 *
 * Use inside {@link provideAccountFeature}:
 * ```typescript
 * provideAccountFeature(
 *   withAccountNavigation(),
 *   withAccountHeaderActions(),
 * )
 * ```
 *
 * @returns {AccountFeature}
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withAccountHeaderActions(): AccountFeature {
  return {
    providers: [
      {
        provide: HEADER_ACTION_SLOT,
        useFactory: () => ({
          id: 'notification-bell',
          order: 20,
          component: NotificationBell,
        }),
        multi: true,
      },
      {
        provide: HEADER_ACTION_SLOT,
        useFactory: () => ({
          id: 'user-menu',
          order: 30,
          component: AccountUserMenu,
        }),
        multi: true,
      },
    ],
  };
}
