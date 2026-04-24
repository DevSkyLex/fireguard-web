import { computed, inject } from '@angular/core';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import { OrganizationNavPanel } from '@features/organization/ui/components/organization-nav-panel';
import { CONTEXT_PANEL_SLOT } from '@layouts/dashboard-layout/slots/context-panel';
import type { OrganizationFeature } from '../../organization.feature';

/**
 * Feature withOrganizationContextPanel
 *
 * @description
 * Registers the organization context panel in the dashboard context panel slot.
 * Displays the `OrganizationNavPanel` component when an organization is selected.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * provideOrganizationFeature(withOrganizationContextPanel())
 * ```
 */
export function withOrganizationContextPanel(): OrganizationFeature {
  return {
    providers: [
      {
        provide: CONTEXT_PANEL_SLOT,
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
        multi: true,
      },
    ],
  };
}
