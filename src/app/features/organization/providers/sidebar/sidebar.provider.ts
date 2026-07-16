import { OrganizationSwitcher } from '@features/organization/ui/components/organization-switcher';
import type { DashboardLayoutSidebarSlotFeature } from '@layouts/dashboard-layout';

/**
 * Function withOrganizationSwitcher
 * @function withOrganizationSwitcher
 *
 * @description
 * Registers the {@link OrganizationSwitcher} component into the dashboard
 * sidebar slot (`lead` region, below the brand row).
 *
 * Use inside {@link provideDashboardLayoutSlots}:
 * ```typescript
 * provideDashboardLayoutSlots({ sidebar: [withOrganizationSwitcher()] })
 * ```
 *
 * @returns {DashboardLayoutSidebarSlotFeature}
 *
 * @since 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withOrganizationSwitcher(): DashboardLayoutSidebarSlotFeature {
  return {
    useFactory: () => ({
      id: 'organization-switcher',
      order: 10,
      region: 'lead',
      component: OrganizationSwitcher,
    }),
  };
}
