import type { OrganizationFeature } from '@features/organization/organization.feature';
import { HEADER_ACTION_SLOT } from '@layouts/dashboard-layout/slots/header-action';
import { OrganizationSwitcher } from '@features/organization/ui/components/organization-switcher/organization-switcher.component';

/**
 * Function withOrganizationHeaderAction
 * @function withOrganizationHeaderAction
 *
 * @description
 * Registers the {@link OrganizationSwitcher} component into the
 * `HEADER_ACTION_SLOT` extension point.
 *
 * Use inside {@link provideOrganizationFeature}:
 * ```typescript
 * provideOrganizationFeature(
 *   withOrganizationNavigation(),
 *   withOrganizationContextPanel(),
 *   withOrganizationHeaderAction(),
 * )
 * ```
 *
 * @returns {OrganizationFeature}
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withOrganizationHeaderAction(): OrganizationFeature {
  return {
    providers: [
      {
        provide: HEADER_ACTION_SLOT,
        useFactory: () => ({
          id: 'organization-switcher',
          order: 10,
          component: OrganizationSwitcher,
        }),
        multi: true,
      },
    ],
  };
}
