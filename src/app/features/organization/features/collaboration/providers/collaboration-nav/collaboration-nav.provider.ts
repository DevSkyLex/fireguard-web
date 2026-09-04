import type { AdditiveSlotFeature } from '@shared/layout-slot';
import { CollaborationNav } from '../../ui/components/collaboration-nav';

/**
 * Function withCollaborationNav
 * @function withCollaborationNav
 *
 * @description
 * Contributes Messages and Collaboration to the sidebar footer before Support.
 * Conversation browsing is supplied separately by the sidebar-extension slot.
 *
 * @access public
 * @since 1.0.0
 *
 * @returns {AdditiveSlotFeature} The contribution factory, run by the layout's injector.
 *
 * @example
 * ```typescript
 * provideDashboardLayoutSlots({ sidebarFooter: [withCollaborationNav(), withDashboardGlobalNav(), withAccountMenu()] })
 * ```
 */
export function withCollaborationNav(): AdditiveSlotFeature {
  return {
    useFactory: () => ({
      id: 'collaboration-nav',
      order: 0,
      component: CollaborationNav,
    }),
  };
}
