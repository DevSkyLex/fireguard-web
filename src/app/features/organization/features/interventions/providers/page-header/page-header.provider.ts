import { InterventionHeaderActions } from '@features/organization/features/interventions/ui/components';
import type { DashboardLayoutPageHeaderSlotFeature } from '@layouts/dashboard-layout';

/**
 * Provider withInterventionHeaderActions
 *
 * @description
 * Contributes the intervention detail's main actions (prev/next navigation,
 * request changes, the canonical phase action and the overflow menu) to the
 * dashboard layout's page-header action slot. The widget renders nothing on
 * routes where the detail page publishes no header state.
 *
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * provideDashboardLayoutSlots({
 *   pageHeader: [withInterventionHeaderActions()],
 * });
 * ```
 *
 * @returns {DashboardLayoutPageHeaderSlotFeature} The page-header slot contribution.
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withInterventionHeaderActions(): DashboardLayoutPageHeaderSlotFeature {
  return {
    useFactory: () => ({
      id: 'intervention-header-actions',
      order: 10,
      component: InterventionHeaderActions,
    }),
  };
}
