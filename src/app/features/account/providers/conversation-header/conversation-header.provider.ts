import { AccountMenu, NotificationBell } from '@features/account/ui/components';
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

/**
 * Function withAccountMenu
 * @function withAccountMenu
 *
 * @description
 * Registers the {@link AccountMenu} as the last item of the workspace header's
 * tool cluster — the seat avatar the member opens to reach their profile,
 * notifications and sign-out.
 *
 * It sat at the foot of the 60px organization rail until the shell dropped that
 * column. The rail was desktop-only, so profile and sign-out were unreachable
 * on a phone; the header exists at every width.
 *
 * Use inside {@link provideWorkspaceLayoutSlots}:
 * ```typescript
 * provideWorkspaceLayoutSlots({ conversationHeader: [withAccountMenu()] })
 * ```
 *
 * @returns {WorkspaceLayoutConversationHeaderSlotFeature}
 *
 * @since 1.2.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withAccountMenu(): WorkspaceLayoutConversationHeaderSlotFeature {
  return {
    useFactory: () => ({
      id: 'account-menu',
      order: 40,
      component: AccountMenu,
    }),
  };
}
