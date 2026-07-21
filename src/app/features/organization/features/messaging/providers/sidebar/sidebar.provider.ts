import { computed, inject } from '@angular/core';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
  type OrganizationContextPort,
  type OrganizationMemberAccessPort,
} from '@features/organization/ports';
import type { DashboardLayoutSidebarSlotFeature } from '@layouts/dashboard-layout';

/**
 * Function withMessagingSidebar
 * @function withMessagingSidebar
 *
 * @description
 * Registers the {@link MessagingSidebar} sections — channel search, Favorites,
 * Channels — into the shell sidebar's `content` region, below the navigation.
 * Only available inside an organization whose member holds `messaging.read`;
 * for everyone else the sections simply do not exist.
 *
 * Use inside {@link provideDashboardLayoutSlots}:
 * ```typescript
 * provideDashboardLayoutSlots({ sidebar: [withMessagingSidebar()] })
 * ```
 *
 * @returns {DashboardLayoutSidebarSlotFeature}
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withMessagingSidebar(): DashboardLayoutSidebarSlotFeature {
  return {
    useFactory: () => {
      const context: OrganizationContextPort = inject(ORGANIZATION_CONTEXT_PORT);
      const memberAccess: OrganizationMemberAccessPort = inject(ORGANIZATION_MEMBER_ACCESS_PORT);

      return {
        id: 'messaging-sidebar',
        order: 20,
        region: 'content',
        loadComponent: () =>
          import('@features/organization/features/messaging/ui/components/messaging-sidebar/messaging-sidebar.component').then(
            (m) => m.MessagingSidebar,
          ),
        available: computed((): boolean => {
          if (!context.selectedOrganization()) return false;

          const granted: ReadonlySet<string> = new Set(memberAccess.permissions());

          return (
            granted.has(ORGANIZATION_PERMISSION.MESSAGING_READ) ||
            Array.from(granted).some(
              (permission: string): boolean =>
                permission.endsWith('.*') &&
                ORGANIZATION_PERMISSION.MESSAGING_READ.startsWith(permission.slice(0, -1)),
            )
          );
        }),
      };
    },
  };
}
