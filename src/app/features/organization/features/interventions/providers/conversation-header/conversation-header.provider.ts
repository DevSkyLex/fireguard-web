import { InterventionSyncChip } from '@features/organization/features/interventions/ui/components';
import type { WorkspaceLayoutConversationHeaderSlotFeature } from '@layouts/workspace-layout';

/**
 * Provider withInterventionSyncChip
 *
 * @description
 * Contributes the offline/sync status chip to the workspace header's tool
 * cluster: connectivity state, pending local changes, blocked operations, and a
 * manual "Sync now" action.
 *
 * Ordered right after the messaging sync chip (order 10): `PRODUCT.md` makes
 * offline a first-class state, so both indicators stay at the head of the
 * cluster where a narrow header cannot push them off the end.
 *
 * @version 2.0.0
 *
 * @example
 * ```typescript
 * provideWorkspaceLayoutSlots({
 *   conversationHeader: [withInterventionSyncChip()],
 * });
 * ```
 *
 * @returns {WorkspaceLayoutConversationHeaderSlotFeature} The tool-cluster contribution.
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withInterventionSyncChip(): WorkspaceLayoutConversationHeaderSlotFeature {
  return {
    useFactory: () => ({
      id: 'intervention-sync-chip',
      order: 12,
      component: InterventionSyncChip,
    }),
  };
}
