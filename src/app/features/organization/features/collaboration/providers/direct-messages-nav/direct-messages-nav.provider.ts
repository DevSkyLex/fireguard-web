import type { AdditiveSlotFeature } from '@shared/layout-slot';
import { DirectMessagesNav } from '../../ui/components';

/**
 * Function withDirectMessagesNav
 * @function withDirectMessagesNav
 *
 * @description
 * Contributes {@link DirectMessagesNav} to a shell's sidebar-nav slot, below
 * {@link withOrganizationNav}'s destinations: the conversation list only has
 * something to show while the messages surface is open, so it sits under the
 * organization's fixed navigation rather than above it. The shell stays
 * ignorant of the messaging domain: it renders whatever the slot holds
 * (`ARCHITECTURE.md` §2.4, §8.2).
 *
 * @access public
 * @since 1.0.0
 *
 * @returns {AdditiveSlotFeature} The contribution factory, run by the layout's injector.
 *
 * @example
 * ```typescript
 * provideDashboardLayoutSlots({ sidebarNav: [withOrganizationNav(), withDirectMessagesNav()] })
 * ```
 */
export function withDirectMessagesNav(): AdditiveSlotFeature {
  return {
    useFactory: () => ({
      id: 'direct-messages-nav',
      order: 20,
      component: DirectMessagesNav,
    }),
  };
}
