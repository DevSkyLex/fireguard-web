import { AccountTopbarMenu } from '@features/account/ui/components/account-topbar-menu/account-topbar-menu.component';
import { NotificationBell } from '@features/account/ui/components/notification-bell/notification-bell.component';
import type { DashboardLayoutTopbarSlotFeature } from '@layouts/dashboard-layout';

/**
 * Function withNotificationBell
 * @function withNotificationBell
 *
 * @description
 * Registers the {@link NotificationBell} component into the dashboard topbar slot.
 *
 * Use inside {@link provideDashboardLayoutSlots}:
 * ```typescript
 * provideDashboardLayoutSlots({ topbar: [withNotificationBell()] })
 * ```
 *
 * @returns {DashboardLayoutTopbarSlotFeature}
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withNotificationBell(): DashboardLayoutTopbarSlotFeature {
  return {
    useFactory: () => ({
      id: 'notification-bell',
      order: 20,
      component: NotificationBell,
    }),
  };
}

/**
 * Function withAccountMenu
 * @function withAccountMenu
 *
 * @description
 * Registers the account avatar menu into the dashboard topbar, where it shows
 * on narrow screens only.
 *
 * Below `lg` the organization rail — which carries this menu — lives inside
 * the left drawer, so reaching the account or signing out took opening the
 * drawer first. Ordered after the notification bell so the account stays the
 * rightmost, thumb-nearest control.
 *
 * @returns {DashboardLayoutTopbarSlotFeature}
 *
 * @since 1.1.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withAccountMenu(): DashboardLayoutTopbarSlotFeature {
  return {
    useFactory: () => ({
      id: 'account-menu',
      order: 30,
      component: AccountTopbarMenu,
    }),
  };
}
