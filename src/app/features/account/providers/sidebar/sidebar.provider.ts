import { AccountRailMenu } from '@features/account/ui/components/account-rail-menu/account-rail-menu.component';
import type { DashboardLayoutSidebarSlotFeature } from '@layouts/dashboard-layout';

/**
 * Function withAccountProfile
 * @function withAccountProfile
 *
 * @description
 * Registers the {@link AccountRailMenu} — the account avatar with its menu
 * popover — at the bottom edge of the shell's organization rail
 * (`rail-end` region), where the prototype pins the signed-in user.
 *
 * Use inside {@link provideDashboardLayoutSlots}:
 * ```typescript
 * provideDashboardLayoutSlots({ sidebar: [withAccountProfile()] })
 * ```
 *
 * @returns {DashboardLayoutSidebarSlotFeature}
 *
 * @since 3.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withAccountProfile(): DashboardLayoutSidebarSlotFeature {
  return {
    useFactory: () => ({
      id: 'user-menu',
      order: 10,
      region: 'rail-end',
      component: AccountRailMenu,
    }),
  };
}
