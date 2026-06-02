import { computed, inject } from '@angular/core';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import { OrganizationNavPanel } from '@features/organization/ui/components/organization-nav-panel';
import type { DashboardLayoutAsideSlotFeature } from '@layouts/dashboard-layout';

/**
 * Feature withOrganizationContext
 *
 * @description
 * Registers the organization context in the dashboard aside slot.
 * Displays the `OrganizationNavPanel` component when an organization is selected.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * provideDashboardLayoutSlots({ aside: [withOrganizationContext()] })
 * ```
 */
export function withOrganizationContext(): DashboardLayoutAsideSlotFeature {
  return {
    useFactory: () => {
      const context: OrganizationContextPort =
        inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

      return {
        id: 'organization',
        priority: 10,
        component: OrganizationNavPanel,
        active: computed(() => context.selectedOrganization() !== null),
      };
    },
  };
}
