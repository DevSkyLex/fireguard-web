import type { AdditiveSlotFeature } from '@shared/layout-slot';
import { OrganizationGlobalSearch } from '../../ui/components/organization-global-search';

/**
 * Function withGlobalSearch
 * @function withGlobalSearch
 *
 * @description
 * Contributes {@link OrganizationGlobalSearch} — the magnifier trigger and
 * its Ctrl+K command palette — to a shell's header-actions slot, ahead of
 * the assistant toggle (`order: 5` vs its `10`): search is the first tool
 * reached for, and the fixed order keeps the header cluster stable. The
 * component renders nothing without an active organization, so the
 * contribution is safe on every dashboard page.
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
