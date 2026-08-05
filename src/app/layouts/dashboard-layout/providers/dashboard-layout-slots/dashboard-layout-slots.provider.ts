import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import {
  type AdditiveSlotFeature,
  type ExclusiveSlotFeature,
  provideSlotContributions,
} from '@shared/layout-slot';
import {
  DASHBOARD_HEADER_ACTIONS_SLOT,
  DASHBOARD_HEADER_SLOT,
  DASHBOARD_PANEL_SLOT,
  DASHBOARD_SIDEBAR_FOOTER_SLOT,
  DASHBOARD_SIDEBAR_HEADER_SLOT,
  DASHBOARD_SIDEBAR_NAV_SLOT,
} from '../../slots';

/**
 * Interface DashboardLayoutSlotsConfig
 * @interface DashboardLayoutSlotsConfig
 *
 * @description
 * Declarative composition of the dashboard shell, grouped by region. Omitting a
 * region leaves it empty, and the layout renders no chrome for it.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface DashboardLayoutSlotsConfig {
  /** Top of the sidebar. */
  readonly sidebarHeader?: readonly AdditiveSlotFeature[];
  /** Scrolling body of the sidebar. */
  readonly sidebarNav?: readonly AdditiveSlotFeature[];
  /** Bottom of the sidebar. */
  readonly sidebarFooter?: readonly AdditiveSlotFeature[];
  /** Header, from the sidebar trigger rightwards. */
  readonly header?: readonly AdditiveSlotFeature[];
  /** Tool cluster at the right of the header. */
  readonly headerActions?: readonly AdditiveSlotFeature[];
  /** Mono-active contextual column. */
  readonly panel?: readonly ExclusiveSlotFeature[];
}

/**
 * Function provideDashboardLayoutSlots
 * @function provideDashboardLayoutSlots
 *
 * @description
 * Registers the contributions of a route served by {@link DashboardLayout}.
 * Declare it in that route's `providers`; contributions resolve against that
 * route's injector, so anything the shell route provides is reachable from
 * them.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {DashboardLayoutSlotsConfig} config - Contributions grouped by region.
 *
 * @returns {EnvironmentProviders} Providers to declare on the route hosting the shell.
 *
 * @example
 * ```typescript
 * providers: [
 *   provideDashboardLayoutSlots({
 *     sidebarNav: [withOrganizationNav()],
 *     headerActions: [withThemeSwitcher(), withAccountMenu()],
 *   }),
 * ]
 * ```
 */
export function provideDashboardLayoutSlots(
  config: DashboardLayoutSlotsConfig,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    ...provideSlotContributions(DASHBOARD_SIDEBAR_HEADER_SLOT, config.sidebarHeader),
    ...provideSlotContributions(DASHBOARD_SIDEBAR_NAV_SLOT, config.sidebarNav),
    ...provideSlotContributions(DASHBOARD_SIDEBAR_FOOTER_SLOT, config.sidebarFooter),
    ...provideSlotContributions(DASHBOARD_HEADER_SLOT, config.header),
    ...provideSlotContributions(DASHBOARD_HEADER_ACTIONS_SLOT, config.headerActions),
    ...provideSlotContributions(DASHBOARD_PANEL_SLOT, config.panel),
  ]);
}
