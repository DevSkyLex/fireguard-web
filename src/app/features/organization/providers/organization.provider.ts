import { computed, inject, type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { DASHBOARD_CONTEXT_PANEL_CONTRIBUTION } from '@core/ports/dashboard-context-panel';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
  OrganizationContextPort,
} from '@features/organization/ports';
import {
  ActiveOrganizationStore,
  OrganizationMemberAccessStore,
} from '@features/organization/state';
import { OrganizationNavPanel } from '@features/organization/ui/components/organization-nav-panel';

/**
 * Provider provideOrganization
 *
 * @description
 * Provides the organization feature ports. Binds `ORGANIZATION_CONTEXT_PORT`
 * to `ActiveOrganizationStore` so that layouts and approved sibling features
 * can read the active organization context through a stable port instead
 * of importing the concrete store directly.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function provideOrganization(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: ORGANIZATION_CONTEXT_PORT,
      useExisting: ActiveOrganizationStore,
    },
    {
      provide: ORGANIZATION_MEMBER_ACCESS_PORT,
      useExisting: OrganizationMemberAccessStore,
    },
    {
      provide: DASHBOARD_CONTEXT_PANEL_CONTRIBUTION,
      useFactory: () => {
        /**
         * Constant context
         * @const context
         *
         * @description
         * Local constant to read the organization context port once and
         * avoid injecting it multiple times in the computed `isActive`
         * callback below, which would be inefficient and potentially
         * cause issues with circular dependencies.
         *
         * @type {OrganizationContextPort}
         */
        const context: OrganizationContextPort =
          inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

        // Return the contribution object implementing the contract.
        return {
          id: 'organization',
          priority: 10,
          component: OrganizationNavPanel,
          isActive: computed(() => context.selectedOrganization() !== null),
        };
      },
      multi: true,
    },
  ]);
}
