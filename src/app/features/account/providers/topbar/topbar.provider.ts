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
