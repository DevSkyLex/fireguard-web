import { InterventionHeaderActions } from '@features/organization/features/interventions/ui/components';
import type { WorkspaceLayoutPageHeaderSlotFeature } from '@layouts/workspace-layout';

/**
 * Provider withInterventionHeaderActions
 *
 * @description
 * Contributes the intervention detail's main actions (prev/next navigation,
 * request changes, the canonical phase action and the overflow menu) to the
 * workspace layout's page-header action slot. The widget renders nothing on
 * routes where the detail page publishes no header state.
 *
 * @version 2.0.0
 *
 * @example
 * ```typescript
 * provideWorkspaceLayoutSlots({
 *   pageHeader: [withInterventionHeaderActions()],
 * });
 * ```
 *
 * @returns {WorkspaceLayoutPageHeaderSlotFeature} The page-header slot contribution.
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withInterventionHeaderActions(): WorkspaceLayoutPageHeaderSlotFeature {
  return {
    useFactory: () => ({
      id: 'intervention-header-actions',
      order: 10,
      component: InterventionHeaderActions,
    }),
  };
}
