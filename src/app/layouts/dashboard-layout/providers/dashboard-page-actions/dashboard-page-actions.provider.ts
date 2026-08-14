import type { AdditiveSlotFeature } from '@shared/layout-slot';
import { DashboardPageActions } from '../../components';

/**
 * Function withDashboardPageActions
 * @function withDashboardPageActions
 *
 * @description
 * Contributes {@link DashboardPageActions} to the shell's header-actions
 * slot, first: the activated page's own buttons are the primary tool for
 * that page, so they sit ahead of the app-wide controls that close the
 * cluster.
 *
 * @access public
 * @since 1.0.0
 *
 * @returns {AdditiveSlotFeature} The contribution factory, run by the layout's injector.
 *
 * @example
 * ```typescript
 * provideDashboardLayoutSlots({ headerActions: [withDashboardPageActions()] })
 * ```
 */
export function withDashboardPageActions(): AdditiveSlotFeature {
  return {
    useFactory: () => ({
      id: 'dashboard-page-actions',
      order: 0,
      component: DashboardPageActions,
    }),
  };
}
