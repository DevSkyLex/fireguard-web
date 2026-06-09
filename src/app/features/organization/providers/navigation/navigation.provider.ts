import { computed, inject } from '@angular/core';
import type { MenuItem } from 'primeng/api';
import {
  hasOrganizationNavigationAccess,
  ORGANIZATION_NAVIGATION_ITEMS,
  type OrganizationNavigationItem,
} from '@features/organization/navigation';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
  type OrganizationContextPort,
  type OrganizationMemberAccessPort,
} from '@features/organization/ports';
import type { DashboardLayoutNavigationSlotFeature } from '@layouts/dashboard-layout';

/**
 * Function buildOrganizationSection
 *
 * @description
 * Builds the dashboard layout organization section from the active
 * organization and the canonical permission-filtered navigation contract.
 *
 * @param {string | null} organizationId - Active organization identifier.
 * @param {ReadonlySet<string>} grantedPermissionSet - Active member grants.
 *
 * @returns {MenuItem | null} Organization menu section or null when unavailable.
 *
 * @since 1.0.0
 */
function buildOrganizationSection(
  organizationId: string | null,
  grantedPermissionSet: ReadonlySet<string>,
): MenuItem | null {
  if (organizationId === null) {
    return null;
  }

  const prefix: string = `/organizations/${organizationId}`;
  const items: MenuItem[] = ORGANIZATION_NAVIGATION_ITEMS.filter(
    (item: OrganizationNavigationItem): boolean =>
      hasOrganizationNavigationAccess(item, grantedPermissionSet),
  ).map(
    (item: OrganizationNavigationItem): MenuItem => ({
      id: item.id,
      label: item.label,
      icon: item.icon,
      routerLink: item.path.length > 0 ? `${prefix}/${item.path}` : prefix,
    }),
  );

  if (items.length === 0) {
    return null;
  }

  return {
    id: 'organization',
    label: 'Organization',
    expanded: true,
    items,
  };
}

/**
 * Feature withOrganizationNavigation
 *
 * @description
 * Registers the organization section in the dashboard sidebar navigation slot.
 * Contributes a permission-filtered "Organization" group with links to Dashboard,
 * Facilities, Equipments and Inspections, driven by the active organization context.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * provideDashboardLayoutSlots({ navigation: [withOrganizationNavigation()] })
 * ```
 */
export function withOrganizationNavigation(): DashboardLayoutNavigationSlotFeature {
  return {
    useFactory: () => {
      const context: OrganizationContextPort = inject(ORGANIZATION_CONTEXT_PORT);
      const memberAccess: OrganizationMemberAccessPort = inject(ORGANIZATION_MEMBER_ACCESS_PORT);

      return {
        id: 'organization',
        order: 20,
        includeInPrimary: false,
        section: computed((): MenuItem | null => {
          const organization = context.selectedOrganization();
          const grantedPermissionSet: ReadonlySet<string> = new Set(memberAccess.permissions());

          return buildOrganizationSection(organization?.id ?? null, grantedPermissionSet);
        }),
      };
    },
  };
}
