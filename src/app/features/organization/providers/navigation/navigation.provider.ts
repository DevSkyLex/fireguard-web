import { computed, inject } from '@angular/core';
import type { MenuItem } from 'primeng/api';
import { ACCOUNT_PERMISSION, UserPermissionService } from '@features/account';
import {
  appendOrganizationAuditNavigationItem,
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
 * is offset from this base so the sections keep their canonical order while
 * still sitting after the main "Home" contribution (order 10).
 *
 * @since 1.1.0
 */
const ORGANIZATION_NAVIGATION_BASE_ORDER: number = 20;

/**
 * Feature withOrganizationNavigation
 *
 * @description
 * Registers the organization navigation sections in the dashboard sidebar
 * navigation slot. Contributes one permission-filtered section per
 * {@link ORGANIZATION_NAVIGATION_GROUPS} entry (Overview, Field work, Assets,
 * Compliance, Administration), driven by the active organization context,
 * instead of a single catch-all "Organization" group.
 *
 * The audit log destination is appended to the "Administration" section when
 * the authenticated user holds the global `audit.read` permission. That check
 * goes through the account permission surface ({@link UserPermissionService})
 * because `audit.read` is not an organization-member permission and cannot be
 * expressed through the organization navigation items.
 *
 * @version 1.2.0
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
        const userPermissions: UserPermissionService = inject(UserPermissionService);

        return {
          id: `organization-${group.id}`,
          order: ORGANIZATION_NAVIGATION_BASE_ORDER + index,
          section: computed((): MenuItem | null => {
            const organization = context.selectedOrganization();

            if (!organization) {
              return null;
            }

            const grantedPermissionSet: ReadonlySet<string> = new Set(memberAccess.permissions());
            const prefix: string = `/organizations/${organization.id}`;
            const section: MenuItem | null = buildOrganizationNavigationSection(
              group,
              prefix,
              grantedPermissionSet,
            );

            if (
              group.id !== 'administration' ||
              !userPermissions.hasPermission(ACCOUNT_PERMISSION.AUDIT_READ)
            ) {
              return section;
            }

            return appendOrganizationAuditNavigationItem(section, prefix);
          }),
        };
      },
    }),
  );
}
