import { ChannelInfoToggle } from '@features/organization/features/collaboration/ui/components/channel-info-toggle';
import { MessagingSyncChip } from '@features/organization/features/collaboration/ui/components/messaging-sync-chip';
import type { WorkspaceLayoutConversationHeaderSlotFeature } from '@layouts/workspace-layout';

/**
 * Function withCollaborationInfoToggle
 * @function withCollaborationInfoToggle
 *
 * @description
 * Registers the info-panel toggle in the conversation header's tool cluster.
 *
 * Ordered before `withThemeSwitcher()` (order 30) so contextual controls sit
 * next to the content they act on and app-wide ones stay at the end.
 *
 * @returns {WorkspaceLayoutConversationHeaderSlotFeature}
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withCollaborationInfoToggle(): WorkspaceLayoutConversationHeaderSlotFeature {
  return {
    useFactory: () => ({
      id: 'collaboration-info-toggle',
      order: 20,
      component: ChannelInfoToggle,
    }),
  };
}

/**
 * Function withMessagingSyncChip
 * @function withMessagingSyncChip
 *
 * @description
 * Registers the offline/queued indicator, first in the tool cluster.
 *
 * First on purpose: `PRODUCT.md` makes offline a first-class state that is
 * never hidden, so it must not be the control that gets pushed off the end of
 * a narrow header.
 *
 * @returns {WorkspaceLayoutConversationHeaderSlotFeature}
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withMessagingSyncChip(): WorkspaceLayoutConversationHeaderSlotFeature {
  return {
    useFactory: () => ({
      id: 'messaging-sync-chip',
      order: 10,
      component: MessagingSyncChip,
    }),
  };
}
