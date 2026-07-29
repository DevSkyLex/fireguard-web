import { AccountRailMenu } from '@features/account/ui/components';
import type { WorkspaceLayoutRailSlotFeature } from '@layouts/workspace-layout';

/**
 * Function withAccountRailMenu
 * @function withAccountRailMenu
 *
 * @description
 * Registers the {@link AccountRailMenu} at the foot of the workspace rail —
 * the seat avatar the member opens to reach their profile, notifications and
 * sign-out.
 *
 * Use inside {@link provideWorkspaceLayoutSlots}:
 * ```typescript
 * provideWorkspaceLayoutSlots({ rail: [withAccountRailMenu()] })
 * ```
 *
 * @returns {WorkspaceLayoutRailSlotFeature}
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withAccountRailMenu(): WorkspaceLayoutRailSlotFeature {
  return {
    useFactory: () => ({
      id: 'account-rail-menu',
      order: 10,
      region: 'footer',
      component: AccountRailMenu,
    }),
  };
}
