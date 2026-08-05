import type { AdditiveSlotFeature } from '@shared/layout-slot';
import { AccountMenu } from '../../ui/components';

/**
 * Function withAccountMenu
 * @function withAccountMenu
 *
 * @description
 * Contributes {@link AccountMenu} to a shell's sidebar-footer slot. The shell
 * stays ignorant of the account domain: it renders whatever the slot holds
 * (`ARCHITECTURE.md` §2.4, §8.2).
 *
 * @access public
 * @since 1.0.0
 *
 * @returns {AdditiveSlotFeature} The contribution factory, run by the layout's injector.
 *
 * @example
 * ```typescript
 * provideDashboardLayoutSlots({ sidebarFooter: [withAccountMenu()] })
 * ```
 */
export function withAccountMenu(): AdditiveSlotFeature {
  return {
    useFactory: () => ({
      id: 'account-menu',
      order: 10,
      component: AccountMenu,
    }),
  };
}
