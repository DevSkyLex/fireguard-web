import type { AdditiveSlotFeature } from '@shared/layout-slot';
import { NotificationBell } from '../../ui/components';

/**
 * Function withNotificationBell
 * @function withNotificationBell
 *
 * @description
 * Contributes {@link NotificationBell} — the bell, its unread dot, and the menu
 * holding the most recent notifications — to a shell's header-actions slot,
 * between the global search (`order: 5`) and the assistant toggle (`10`): after
 * the tool reached for first, ahead of the ones reached for rarely.
 *
 * @access public
 * @since 1.0.0
 *
 * @returns {AdditiveSlotFeature} The contribution factory, run by the layout's injector.
 *
 * @example
 * ```typescript
 * provideDashboardLayoutSlots({ headerActions: [withGlobalSearch(), withNotificationBell()] })
 * ```
 */
export function withNotificationBell(): AdditiveSlotFeature {
  return {
    useFactory: () => ({
      id: 'notification-bell',
      order: 7,
      component: NotificationBell,
    }),
  };
}
