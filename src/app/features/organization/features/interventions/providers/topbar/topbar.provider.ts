import { InterventionSyncChip } from '@features/organization/features/interventions/ui/components';
import type { DashboardLayoutTopbarSlotFeature } from '@layouts/dashboard-layout';

/**
 * Provider withInterventionSyncChip
 *
 * @description
 * Contributes the offline/sync status chip to the dashboard layout's topbar
 * slot: connectivity state, pending local changes, blocked operations, and a
 * manual "Sync now" action.
 *
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * provideDashboardLayoutSlots({
 *   topbar: [withInterventionSyncChip()],
 * });
 * ```
 *
 * @returns {DashboardLayoutTopbarSlotFeature} The topbar slot contribution.
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withInterventionSyncChip(): DashboardLayoutTopbarSlotFeature {
  return {
    useFactory: () => ({
      id: 'intervention-sync-chip',
      order: 10,
      component: InterventionSyncChip,
    }),
  };
}
