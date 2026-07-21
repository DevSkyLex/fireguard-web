import { computed, inject } from '@angular/core';
import type { MenuItem } from 'primeng/api';
import { SHELL_PANEL_PORT, type ShellPanelPort } from '@core/shell-panel';
import { NOTIFICATION_CENTER_PORT, type NotificationCenterPort } from '@features/account';
import { ASSISTANT_PANEL_ID } from '@features/organization/features/assistant/providers';
import { ConversationInventoryStore } from '@features/organization/features/messaging/state';
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
import { NavigationCountersStore } from '@features/organization/state';
import type { DashboardLayoutNavigationSlotFeature } from '@layouts/dashboard-layout';

/**
 * Base sidebar order for the first organization navigation section. Each group
 * is offset from this base so the sections keep their canonical order.
 *
 * @since 1.1.0
 */
const ORGANIZATION_NAVIGATION_BASE_ORDER: number = 20;

/**
 * Attaches a live count badge to one item of a built section. The badge only
 * renders when the count is positive.
 *
 * @param {MenuItem | null} section - Section built from the navigation catalog.
 * @param {string} itemId - Id of the item receiving the badge.
 * @param {number} count - Current count; `<= 0` leaves the item untouched.
 *
 * @returns {MenuItem | null} Section with the badge applied.
 *
 * @since 1.3.0
 */
function withBadge(section: MenuItem | null, itemId: string, count: number): MenuItem | null {
  if (!section || count <= 0) {
    return section;
  }

  const items: MenuItem[] = [...(section.items ?? [])];
  const index: number = items.findIndex((item: MenuItem): boolean => item.id === itemId);

  if (index >= 0) {
    items[index] = { ...items[index], badge: String(count) };
  }

  return { ...section, items };
}

/**
 * Attaches a click command to one item of a built section. Used to wire the
 * catalog's panel items (the Assistant entry) to the shell-panel port — the
 * catalog itself stays a pure module with no runtime dependencies.
 *
 * @param {MenuItem | null} section - Section built from the navigation catalog.
 * @param {string} itemId - Id of the item receiving the command.
 * @param {() => void} command - Callback invoked when the item is activated.
 *
 * @returns {MenuItem | null} Section with the command applied.
 *
 * @since 1.4.0
 */
function withCommand(
  section: MenuItem | null,
  itemId: string,
  command: () => void,
): MenuItem | null {
  if (!section) {
    return section;
  }

  const items: MenuItem[] = [...(section.items ?? [])];
  const index: number = items.findIndex((item: MenuItem): boolean => item.id === itemId);

  if (index >= 0) {
    items[index] = { ...items[index], command };
  }

  return { ...section, items };
}

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
        // Optional: the shell-panel port is bound by the dashboard layout
        // slots. Outside that shell (and in isolated specs) the Assistant
        // entry simply stays inert instead of the navigation failing to build.
        const shellPanel: ShellPanelPort | null = inject(SHELL_PANEL_PORT, { optional: true });
        // Optional: the conversation inventory only exists inside the dashboard
        // shell. Outside it — and in layout specs — the Messages badge simply
        // does not render, rather than the whole navigation failing to build.
        const inventory = inject(ConversationInventoryStore, { optional: true });
        // Optional for the same reason: the counters store follows the
        // organization context bound by provideOrganizationFeature().
        const counters = inject(NavigationCountersStore, { optional: true });

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

            if (group.id === 'workspace') {
              // Prototype badges on the business nav: open interventions and
              // open non-conformities, degraded to 0 (hidden) server-side
              // when the member lacks the matching read permission.
              return withBadge(
                withBadge(section, 'interventions', counters?.openInterventions() ?? 0),
                'compliance',
                counters?.openNonConformities() ?? 0,
              );
            }

            if (group.id !== 'utilities') return section;

            // Two independent counts on the same section: notifications feed
            // Inbox, conversations feed Messages. They are not interchangeable
            // — a mention raises both, everything else raises one.
            const badged: MenuItem | null = withBadge(
              withInboxBadge(section, notificationCenter.unreadCount()),
              'messages',
              inventory?.totalUnread() ?? 0,
            );

            return shellPanel
              ? withCommand(badged, 'assistant', (): void => shellPanel.toggle(ASSISTANT_PANEL_ID))
              : badged;
          }),
        };
      },
    }),
  );
}
