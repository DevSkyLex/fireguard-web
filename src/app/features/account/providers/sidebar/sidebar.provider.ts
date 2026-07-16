import { AccountUserMenu } from '@features/account/ui/components/account-user-menu/account-user-menu.component';
import type { DashboardLayoutSidebarSlotFeature } from '@layouts/dashboard-layout';

/**
 * Function withAccountProfile
 * @function withAccountProfile
 *
 * @description
 * Registers the {@link AccountUserMenu} component into the dashboard
 * sidebar slot (`footer` region, pinned at the bottom).
 *
 * Use inside {@link provideDashboardLayoutSlots}:
 * ```typescript
 * provideDashboardLayoutSlots({ sidebar: [withAccountProfile()] })
 * ```
 *
 * @returns {DashboardLayoutSidebarSlotFeature}
 *
 * @since 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withAccountProfile(): DashboardLayoutSidebarSlotFeature {
  return {
    useFactory: () => ({
      id: 'user-menu',
      order: 10,
      region: 'footer',
      component: AccountUserMenu,
    }),
  };
}
