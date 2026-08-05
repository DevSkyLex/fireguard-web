import type { AdditiveSlotFeature } from '@shared/layout-slot';
import { DashboardBreadcrumb } from '../../components';

/**
 * Function withDashboardBreadcrumb
 * @function withDashboardBreadcrumb
 *
 * @description
 * Contributes {@link DashboardBreadcrumb} to the shell's header slot.
 *
 * It is the shell's own chrome rather than a feature's — the trail describes
 * position in the workspace, not a workflow — but it still goes through the
 * slot, so a route that owns its header can replace it (`ARCHITECTURE.md` §8.2).
 *
 * @access public
 * @since 1.0.0
 *
 * @returns {AdditiveSlotFeature} The contribution factory, run by the layout's injector.
 *
 * @example
 * ```typescript
 * provideDashboardLayoutSlots({ header: [withDashboardBreadcrumb()] })
 * ```
 */
export function withDashboardBreadcrumb(): AdditiveSlotFeature {
  return {
    useFactory: () => ({
      id: 'dashboard-breadcrumb',
      order: 10,
      component: DashboardBreadcrumb,
    }),
  };
}
