import { OrganizationMobileNavigation } from '@features/organization/ui/components/organization-mobile-navigation';
import type { AdditiveSlotFeature } from '@shared/layout-slot';

/**
 * Function withOrganizationMobileNavigation
 *
 * @description
 * Contributes the organization-owned mobile destinations to a shell slot. The
 * shell chooses when and where to render it without owning routes or RBAC.
 *
 * @access public
 * @since 1.0.0
 *
 * @returns {AdditiveSlotFeature} Contribution factory resolved by the shell injector.
 *
 * @function withOrganizationMobileNavigation
 */
export function withOrganizationMobileNavigation(): AdditiveSlotFeature {
  return {
    useFactory: () => ({
      id: 'organization-mobile-navigation',
      order: 10,
      component: OrganizationMobileNavigation,
    }),
  };
}
