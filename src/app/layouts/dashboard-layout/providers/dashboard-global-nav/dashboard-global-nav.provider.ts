import type { AdditiveSlotFeature } from '@shared/layout-slot';
import { DashboardGlobalNav } from '../../components';

/**
 * Function withDashboardGlobalNav
 * @function withDashboardGlobalNav
 *
 * @description
 * Contributes {@link DashboardGlobalNav} to the shell's sidebar-nav slot, last:
 * it is the part of the navigation that no organization owns, so it sits under
 * the work rather than above it, and stays when the work is not there.
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
 * provideDashboardLayoutSlots({ sidebarNav: [withDashboardGlobalNav()] })
 * ```
 */
export function withDashboardGlobalNav(): AdditiveSlotFeature {
  return {
    useFactory: () => ({
      id: 'dashboard-global-nav',
      order: 90,
      component: DashboardGlobalNav,
    }),
  };
}
