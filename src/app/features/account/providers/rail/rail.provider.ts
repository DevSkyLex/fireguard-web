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
 * Deliberately not {@link AccountUserMenu}: that one is a full-width row that
 * expands inline in the dashboard sidebar and measures ~215px, which does not
 * fit a 60px rail. Both read the same ports.
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
