import type { AdditiveSlotFeature } from '@shared/layout-slot';
import { OrganizationSwitcher } from '../../ui/components';

/**
 * Function withOrganizationSwitcher
 * @function withOrganizationSwitcher
 *
 * @description
 * Contributes {@link OrganizationSwitcher} to a shell's sidebar-header slot.
 * The shell stays ignorant of the organization domain: it renders whatever the
 * slot holds (`ARCHITECTURE.md` §2.4, §8.2).
 *
 * @access public
 * @since 1.0.0
 *
 * @returns {AdditiveSlotFeature} The contribution factory, run by the layout's injector.
 *
 * @example
 * ```typescript
 * provideDashboardLayoutSlots({ sidebarHeader: [withOrganizationSwitcher()] })
 * ```
 */
export function withOrganizationSwitcher(): AdditiveSlotFeature {
  return {
    useFactory: () => ({
      id: 'organization-switcher',
      order: 10,
      component: OrganizationSwitcher,
    }),
  };
}
