import { computed, inject } from '@angular/core';
import type { MenuItem } from 'primeng/api';
import { NOTIFICATION_CENTER_PORT, type NotificationCenterPort } from '@features/account';
import {
  buildOrganizationNavigationSection,
  ORGANIZATION_NAVIGATION_GROUPS,
  type OrganizationNavigationGroup,
} from '@features/organization/navigation';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
  type OrganizationContextPort,
  type OrganizationMemberAccessPort,
} from '@features/organization/ports';
import type { DashboardLayoutNavigationSlotFeature } from '@layouts/dashboard-layout';

/**
 * Base sidebar order for the first organization navigation section. Each group
 * is offset from this base so the sections keep their canonical order.
 *
 * @since 1.1.0
 */
const ORGANIZATION_NAVIGATION_BASE_ORDER: number = 20;

/**
 * Attaches the live unread badge to the inbox entry of a built section. The
 * count comes from the account's notification center — the unified inbox is
 * fed by the same stream — and the badge only renders when something is
 * actually unread.
 *
 * @param {MenuItem | null} section - Utilities section built from the navigation catalog.
 * @param {number} unreadCount - Current unread notification count.
 *
 * @returns {MenuItem | null} Section with the inbox badge applied.
 *
 * @since 1.3.0
 */
function withInboxBadge(section: MenuItem | null, unreadCount: number): MenuItem | null {
  if (!section || unreadCount <= 0) {
    return section;
  }

  const items: MenuItem[] = [...(section.items ?? [])];
  const inboxIndex: number = items.findIndex((item: MenuItem): boolean => item.id === 'inbox');

  if (inboxIndex >= 0) {
    items[inboxIndex] = { ...items[inboxIndex], badge: String(unreadCount) };
  }

  return { ...section, items };
}

/**
 * Feature withOrganizationNavigation
 *
 * @description
 * Registers the organization navigation in the dashboard sidebar navigation
 * slot: the prototype's flat business navigation (`workspace`) followed by the
 * workspace utilities cluster (`utilities`), both permission-filtered and
 * driven by the active organization context.
 *
 * Members, Roles, Settings and the audit log no longer appear here — they are
 * settings child routes reached through the sidebar header's cog.
 *
 * @version 1.3.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * provideDashboardLayoutSlots({ navigation: [...withOrganizationNavigation()] })
 * ```
 */
export function withOrganizationNavigation(): DashboardLayoutNavigationSlotFeature[] {
  return ORGANIZATION_NAVIGATION_GROUPS.map(
    (group: OrganizationNavigationGroup, index: number): DashboardLayoutNavigationSlotFeature => ({
      useFactory: () => {
        const context: OrganizationContextPort = inject(ORGANIZATION_CONTEXT_PORT);
        const memberAccess: OrganizationMemberAccessPort = inject(ORGANIZATION_MEMBER_ACCESS_PORT);
        const notificationCenter: NotificationCenterPort = inject(NOTIFICATION_CENTER_PORT);

        return {
          id: `organization-${group.id}`,
          order: ORGANIZATION_NAVIGATION_BASE_ORDER + index,
          section: computed((): MenuItem | null => {
            const organization = context.selectedOrganization();

            if (!organization) {
              return null;
            }

            const grantedPermissionSet: ReadonlySet<string> = new Set(memberAccess.permissions());
            const section: MenuItem | null = buildOrganizationNavigationSection(
              group,
              `/organizations/${organization.id}`,
              grantedPermissionSet,
            );

            return group.id === 'utilities'
              ? withInboxBadge(section, notificationCenter.unreadCount())
              : section;
          }),
        };
      },
    }),
  );
}
