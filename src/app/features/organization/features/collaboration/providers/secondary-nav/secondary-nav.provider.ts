import { CollaborationChannelNav } from '@features/organization/features/collaboration/ui/components/collaboration-channel-nav';
import { CollaborationDirectNav } from '@features/organization/features/collaboration/ui/components/collaboration-direct-nav';
import type { WorkspaceLayoutSecondaryNavSlotFeature } from '@layouts/workspace-layout';

/**
 * Function withCollaborationChannelNav
 * @function withCollaborationChannelNav
 *
 * @description
 * Registers the favorites and channel sections beneath the organization's
 * business navigation in the workspace sidebar.
 *
 * Ordered after `withOrganizationWorkspaceNav()` (order 10) so the sidebar
 * reads as the prototype does: what the organization is, then what the team is
 * talking about.
 *
 * @returns {WorkspaceLayoutSecondaryNavSlotFeature}
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withCollaborationChannelNav(): WorkspaceLayoutSecondaryNavSlotFeature {
  return {
    useFactory: () => ({
      id: 'collaboration-channel-nav',
      order: 20,
      component: CollaborationChannelNav,
    }),
  };
}

/**
 * Function withCollaborationDirectNav
 * @function withCollaborationDirectNav
 *
 * @description
 * Registers the direct-messages section beneath the channel list in the
 * workspace sidebar.
 *
 * Ordered after `withCollaborationChannelNav()` (order 20) so the sidebar reads
 * as the prototype does: channels first, then the member's private
 * conversations.
 *
 * @returns {WorkspaceLayoutSecondaryNavSlotFeature}
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withCollaborationDirectNav(): WorkspaceLayoutSecondaryNavSlotFeature {
  return {
    useFactory: () => ({
      id: 'collaboration-direct-nav',
      order: 30,
      component: CollaborationDirectNav,
    }),
  };
}
