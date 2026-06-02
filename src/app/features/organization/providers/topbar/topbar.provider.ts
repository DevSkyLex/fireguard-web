import { OrganizationSwitcher } from '@features/organization/ui/components/organization-switcher/organization-switcher.component';
import type { DashboardLayoutTopbarSlotFeature } from '@layouts/dashboard-layout';

/**
 * Function withOrganizationSwitcher
 * @function withOrganizationSwitcher
 *
 * @description
 * Registers the {@link OrganizationSwitcher} component into the dashboard topbar slot.
 *
 * Use inside {@link provideDashboardLayoutSlots}:
 * ```typescript
 * provideDashboardLayoutSlots({ topbar: [withOrganizationSwitcher()] })
 * ```
 *
 * @returns {DashboardLayoutTopbarSlotFeature}
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withOrganizationSwitcher(): DashboardLayoutTopbarSlotFeature {
  return {
    useFactory: () => ({
      id: 'organization-switcher',
      order: 10,
      component: OrganizationSwitcher,
    }),
  };
}
