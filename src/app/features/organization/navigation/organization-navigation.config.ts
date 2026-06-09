import {
  ORGANIZATION_PERMISSION,
  type OrganizationPermissionName,
} from '@features/organization/models';

/**
 * Type OrganizationNavigationMatch
 *
 * @description
 * Defines whether all or only one of an organization's navigation item
 * permissions must be granted before the item becomes accessible.
 *
 * @since 1.0.0
 */
export type OrganizationNavigationMatch = 'all' | 'any';

/**
 * Interface OrganizationNavigationItem
 *
 * @description
 * Describes an organization-owned navigation destination and the permissions
 * required to expose it.
 *
 * @since 1.0.0
 */
export interface OrganizationNavigationItem {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly path: string;
  readonly permissions: ReadonlyArray<OrganizationPermissionName>;
  readonly match?: OrganizationNavigationMatch;
}

/**
 * Constant ORGANIZATION_NAVIGATION_ITEMS
 *
 * @description
 * Canonical ordered list of organization destinations. The dashboard
 * navigation provider, organization panel and landing guard all consume this
 * list so route visibility and fallback behavior cannot diverge.
 *
 * @since 1.0.0
 */
export const ORGANIZATION_NAVIGATION_ITEMS: ReadonlyArray<OrganizationNavigationItem> = [
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
  {
    id: 'checklists',
    label: 'Checklists',
    icon: 'pi pi-list-check',
    path: 'checklists',
    permissions: [ORGANIZATION_PERMISSION.INSPECTION_READ],
  },
  {
    id: 'team',
    label: 'Team',
    icon: 'pi pi-users',
    path: 'team',
    permissions: [
      ORGANIZATION_PERMISSION.MEMBERS_READ,
      ORGANIZATION_PERMISSION.MEMBERS_MANAGE,
      ORGANIZATION_PERMISSION.ROLES_READ,
      ORGANIZATION_PERMISSION.ROLES_MANAGE,
    ],
    match: 'any',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'pi pi-cog',
    path: 'settings/legal',
    permissions: [ORGANIZATION_PERMISSION.LEGAL_PROFILE_WRITE],
  },
];

/**
 * Function matchesOrganizationPermission
 *
 * @description
 * Checks an exact organization permission or a namespace wildcard grant such
 * as `organization.*`.
 *
 * @param {string} grantedPermission - Permission granted to the active member.
 * @param {OrganizationPermissionName} requiredPermission - Permission required by the action.
 *
 * @returns {boolean} Whether the grant satisfies the required permission.
 *
 * @since 1.0.0
 */
export function matchesOrganizationPermission(
  grantedPermission: string,
  requiredPermission: OrganizationPermissionName,
): boolean {
  if (grantedPermission === requiredPermission) {
    return true;
  }

  return (
    grantedPermission.endsWith('.*') &&
    requiredPermission.startsWith(grantedPermission.slice(0, -1))
  );
}

/**
 * Function hasOrganizationNavigationAccess
 *
 * @description
 * Evaluates a navigation item's permission contract against the active
 * member's grants.
 *
 * @param {OrganizationNavigationItem} item - Navigation item to evaluate.
 * @param {ReadonlySet<string>} grantedPermissions - Active member permissions.
 *
 * @returns {boolean} Whether the item is accessible.
 *
 * @since 1.0.0
 */
export function hasOrganizationNavigationAccess(
  item: OrganizationNavigationItem,
  grantedPermissions: ReadonlySet<string>,
): boolean {
  const hasPermission = (permission: OrganizationPermissionName): boolean =>
    grantedPermissions.has(permission) ||
    Array.from(grantedPermissions).some((grantedPermission: string): boolean =>
      matchesOrganizationPermission(grantedPermission, permission),
    );

  return item.match === 'any'
    ? item.permissions.some(hasPermission)
    : item.permissions.every(hasPermission);
}
