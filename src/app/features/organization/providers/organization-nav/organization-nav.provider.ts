import type { AdditiveSlotFeature } from '@shared/layout-slot';
import { OrganizationNav } from '../../ui/components';

/**
 * Function withOrganizationNav
 * @function withOrganizationNav
 *
 * @description
 * Contributes {@link OrganizationNav} to the top of a shell's sidebar-nav slot:
 * it is the half of the column that only exists while an organization is
 * selected. The shell stays ignorant of the organization domain: it renders
 * whatever the slot holds (`ARCHITECTURE.md` §2.4, §8.2).
 *
 * @access public
 * @since 1.0.0
 *
 * @returns {AdditiveSlotFeature} The contribution factory, run by the layout's injector.
 *
 * @example
 * ```typescript
 * provideDashboardLayoutSlots({ sidebarNav: [withOrganizationNav()] })
 * ```
 */
export function withOrganizationNav(): AdditiveSlotFeature {
  return {
    useFactory: () => ({
      id: 'organization-nav',
      order: 10,
      component: OrganizationNav,
    }),
  };
}
