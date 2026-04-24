import { computed, inject } from '@angular/core';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
  type OrganizationContextPort,
  type OrganizationMemberAccessPort,
} from '@features/organization/ports';
import {
  ORGANIZATION_PERMISSION,
  type OrganizationPermissionName,
} from '@features/organization/models';
import { SIDEBAR_NAVIGATION_SLOT } from '@layouts/dashboard-layout/slots/sidebar-navigation';
import type { MenuItem } from 'primeng/api';
import type { OrganizationFeature } from '../../organization.feature';

type OrganizationSidebarNavigationItem = Readonly<{
  id: string;
  label: string;
  icon: string;
  path: string;
  permissions: ReadonlyArray<OrganizationPermissionName>;
}>;

const ORGANIZATION_NAVIGATION_ITEMS: ReadonlyArray<OrganizationSidebarNavigationItem> = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'pi pi-chart-bar',
    path: '',
    permissions: [ORGANIZATION_PERMISSION.DASHBOARD_READ],
  },
  {
    id: 'facilities',
    label: 'Facilities',
    icon: 'pi pi-map',
    path: 'facilities',
    permissions: [ORGANIZATION_PERMISSION.FACILITIES_READ],
  },
  {
    id: 'equipments',
    label: 'Equipments',
    icon: 'pi pi-box',
    path: 'equipments',
    permissions: [ORGANIZATION_PERMISSION.EQUIPMENT_READ],
  },
  {
    id: 'inspections',
    label: 'Inspections',
    icon: 'pi pi-clipboard',
    path: 'inspections',
    permissions: [ORGANIZATION_PERMISSION.INSPECTION_READ],
  },
];

function matchesPermissionName(
  grantedPermission: string,
  requiredPermission: OrganizationPermissionName,
): boolean {
  if (grantedPermission === requiredPermission) {
    return true;
  }

  if (!grantedPermission.endsWith('.*')) {
    return false;
  }

  return requiredPermission.startsWith(grantedPermission.slice(0, -1));
}

function hasGrantedPermission(
  permission: OrganizationPermissionName,
  grantedPermissionSet: ReadonlySet<string>,
): boolean {
  if (grantedPermissionSet.has(permission)) {
    return true;
  }

  return Array.from(grantedPermissionSet).some((grantedPermission: string): boolean =>
    matchesPermissionName(grantedPermission, permission),
  );
}

function buildOrganizationSection(
  organizationId: string | null,
  grantedPermissionSet: ReadonlySet<string>,
): MenuItem | null {
  if (organizationId === null) {
    return null;
  }

  const prefix: string = `/organizations/${organizationId}`;
  const items: MenuItem[] = ORGANIZATION_NAVIGATION_ITEMS.filter(
    (item: OrganizationSidebarNavigationItem): boolean =>
      item.permissions.every((p: OrganizationPermissionName): boolean =>
        hasGrantedPermission(p, grantedPermissionSet),
      ),
  ).map(
    (item: OrganizationSidebarNavigationItem): MenuItem => ({
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
 * provideOrganizationFeature(withOrganizationNavigation())
 * ```
 */
export function withOrganizationNavigation(): OrganizationFeature {
  return {
    providers: [
      {
        provide: SIDEBAR_NAVIGATION_SLOT,
        useFactory: () => {
          const context: OrganizationContextPort = inject(ORGANIZATION_CONTEXT_PORT);
          const memberAccess: OrganizationMemberAccessPort = inject(ORGANIZATION_MEMBER_ACCESS_PORT);

          return {
            id: 'organization',
            order: 20,
            section: computed((): MenuItem | null => {
              const organization = context.selectedOrganization();
              const grantedPermissionSet: ReadonlySet<string> = new Set(memberAccess.permissions());

              return buildOrganizationSection(organization?.id ?? null, grantedPermissionSet);
            }),
          };
        },
        multi: true,
      },
    ],
  };
}
