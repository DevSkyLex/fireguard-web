import { OrganizationGlobalSearch } from '@features/organization/ui/components/organization-global-search';
import type { AdditiveSlotFeature } from '@shared/layout-slot';

/**
 * Function withGlobalSearch
 * @function withGlobalSearch
 *
 * @description
 * Contributes the organization search trigger ahead of the assistant toggle.
 * The feature initializer owns the shortcut even when the mobile drawer has not
 * mounted its triggers; only opening a palette creates query state.
 *
 * @access public
 * @since 1.0.0
 *
 * @returns {AdditiveSlotFeature} The contribution factory, run by the layout's injector.
 *
 * @example
 * ```typescript
 * provideDashboardLayoutSlots({ headerActions: [withGlobalSearch(), withAssistantToggle()] })
 * ```
 */
export function withGlobalSearch(): AdditiveSlotFeature {
  return {
    useFactory: () => ({
      id: 'organization-global-search',
      order: 5,
      component: OrganizationGlobalSearch,
    }),
  };
}
