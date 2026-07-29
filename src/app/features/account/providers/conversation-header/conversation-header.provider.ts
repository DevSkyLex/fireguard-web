import { NotificationBell } from '@features/account/ui/components/notification-bell/notification-bell.component';
import type { WorkspaceLayoutConversationHeaderSlotFeature } from '@layouts/workspace-layout';

/**
 * Function withNotificationBell
 * @function withNotificationBell
 *
 * @description
 * Registers the {@link NotificationBell} component in the workspace header's
 * tool cluster, after the contextual controls and before the theme switcher.
 *
 * Use inside {@link provideWorkspaceLayoutSlots}:
 * ```typescript
 * provideWorkspaceLayoutSlots({ conversationHeader: [withNotificationBell()] })
 * ```
 *
 * @returns {WorkspaceLayoutConversationHeaderSlotFeature}
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withNotificationBell(): WorkspaceLayoutConversationHeaderSlotFeature {
  return {
    useFactory: () => ({
      id: 'notification-bell',
      order: 25,
      component: NotificationBell,
    }),
  };
}
