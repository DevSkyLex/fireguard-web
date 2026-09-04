import type { AdditiveSlotFeature } from '@shared/layout-slot';
import { DashboardGlobalNav } from '../../components';

/**
 * Function withDashboardGlobalNav
 * @function withDashboardGlobalNav
 *
 * @description
 * Contributes global utilities to the sidebar footer after collaboration links
 * and before the account menu. They remain available without an organization.
 *
 * It is the shell's own chrome rather than a feature's, but it still goes
 * through the slot, so a route that composes its sidebar differently simply
 * leaves it out (`ARCHITECTURE.md` §8.2).
 *
 * @access public
 * @since 1.0.0
 *
 * @returns {AdditiveSlotFeature} The contribution factory, run by the layout's injector.
 *
 * @example
 * ```typescript
 * provideDashboardLayoutSlots({ sidebarFooter: [withDashboardGlobalNav(), withAccountMenu()] })
 * ```
 */
export function withDashboardGlobalNav(): AdditiveSlotFeature {
  return {
    useFactory: () => ({
      id: 'dashboard-global-nav',
      order: 5,
      component: DashboardGlobalNav,
    }),
  };
}
