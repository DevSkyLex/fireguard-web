import type { AdditiveSlotFeature } from '@shared/layout-slot';
import { InterventionSyncIndicator } from '../../ui/components/intervention-sync-indicator';

/**
 * Function withSyncIndicator
 * @function withSyncIndicator
 *
 * @description
 * Contributes {@link InterventionSyncIndicator} to a shell's header-actions
 * slot, right after the assistant toggle — the offline outbox is a permanent
 * condition of the workspace, not a per-page notice, so it earns a fixed
 * header address rather than the per-page mount it used to get.
 *
 * @access public
 * @since 1.0.0
 *
 * @returns {AdditiveSlotFeature} The contribution factory, run by the layout's injector.
 *
 * @example
 * ```typescript
 * provideDashboardLayoutSlots({ headerActions: [withAssistantToggle(), withSyncIndicator()] })
 * ```
 */
export function withSyncIndicator(): AdditiveSlotFeature {
  return {
    useFactory: () => ({
      id: 'intervention-sync-indicator',
      order: 20,
      component: InterventionSyncIndicator,
    }),
  };
}
