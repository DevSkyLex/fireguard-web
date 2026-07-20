import { OrganizationRailSwitcher } from '@features/organization/ui/components/organization-rail-switcher';
import type { DashboardLayoutSidebarSlotFeature } from '@layouts/dashboard-layout';

/**
 * Function withOrganizationSwitcher
 * @function withOrganizationSwitcher
 *
 * @description
 * Registers the {@link OrganizationRailSwitcher} tiles into the dashboard
 * shell's organization rail (`rail` region). The former sidebar dropdown is
 * gone: with a permanent rail, a second switching surface inside the sidebar
 * would only compete with it.
 *
 * Use inside {@link provideDashboardLayoutSlots}:
 * ```typescript
 * provideDashboardLayoutSlots({ sidebar: [withOrganizationSwitcher()] })
 * ```
 *
 * @returns {DashboardLayoutSidebarSlotFeature}
 *
 * @since 3.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withOrganizationSwitcher(): DashboardLayoutSidebarSlotFeature {
  return {
    useFactory: () => ({
      id: 'organization-rail-switcher',
      order: 10,
      region: 'rail',
      component: OrganizationRailSwitcher,
    }),
  };
}
