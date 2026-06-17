import type { MenuItem } from 'primeng/api';
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
 * Type OrganizationNavigationGroupId
 *
 * @description
 * Identifies the logical group a navigation item belongs to. Groups split the
 * organization navigation into meaningful sections instead of a single
 * catch-all "Organization" list.
 *
 * @since 1.1.0
 */
export type OrganizationNavigationGroupId =
  | 'overview'
  | 'field-work'
  | 'assets'
  | 'compliance'
  | 'administration';

/**
 * Interface OrganizationNavigationGroup
 *
 * @description
 * Describes an ordered organization navigation section and its display label.
 *
 * @since 1.1.0
 */
export interface OrganizationNavigationGroup {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Provides the group identifier shared with each navigation item.
   *
   * @type {OrganizationNavigationGroupId}
   */
  readonly id: OrganizationNavigationGroupId;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Provides the human-readable section header rendered above the group items.
   *
   * @type {string}
   */
  readonly label: string;
}

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
  /**
   * Property id
   * @readonly
   *
   * @description
   * Provides the id value.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Provides the label value.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property icon
   * @readonly
   *
   * @description
   * Provides the icon value.
   *
   * @type {string}
   */
  readonly icon: string;

  /**
   * Property path
   * @readonly
   *
   * @description
   * Provides the path value.
   *
   * @type {string}
   */
  readonly path: string;

  /**
   * Property group
   * @readonly
   *
   * @description
   * Provides the navigation group this item is rendered under.
   *
   * @type {OrganizationNavigationGroupId}
   */
  readonly group: OrganizationNavigationGroupId;

  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Provides the permissions value.
   *
   * @type {ReadonlyArray<OrganizationPermissionName>}
   */
  readonly permissions: ReadonlyArray<OrganizationPermissionName>;

  /**
   * Property match
   * @readonly
   *
   * @description
   * Provides the match value.
   *
   * @type {OrganizationNavigationMatch}
   */
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
    group: 'overview',
    permissions: [ORGANIZATION_PERMISSION.DASHBOARD_READ],
  },
  {
    id: 'my-interventions',
    label: 'My interventions',
    icon: 'pi pi-briefcase',
    path: 'interventions/my',
    group: 'field-work',
    permissions: [ORGANIZATION_PERMISSION.INTERVENTIONS_READ],
  },

  /** Intervention workspace entry for field preparation and publication flows. */
  {
    id: 'interventions',
    label: 'Interventions',
    icon: 'pi pi-compass',
    path: 'interventions',
    group: 'field-work',
    permissions: [ORGANIZATION_PERMISSION.INTERVENTIONS_READ],
  },
  {
    id: 'facilities',
    label: 'Facilities',
    icon: 'pi pi-map',
    path: 'facilities',
    group: 'assets',
    permissions: [ORGANIZATION_PERMISSION.FACILITIES_READ],
  },
  {
    id: 'equipments',
    label: 'Equipments',
    icon: 'pi pi-box',
    path: 'equipments',
    group: 'assets',
    permissions: [ORGANIZATION_PERMISSION.EQUIPMENT_READ],
  },
  {
    id: 'inspections',
    label: 'Inspections',
    icon: 'pi pi-clipboard',
    path: 'inspections',
    group: 'compliance',
    permissions: [ORGANIZATION_PERMISSION.INSPECTION_READ],
  },
  {
    id: 'checklists',
    label: 'Checklists',
    icon: 'pi pi-list-check',
    path: 'checklists',
    group: 'compliance',
    permissions: [ORGANIZATION_PERMISSION.INSPECTION_READ],
  },
  {
    id: 'team',
    label: 'Team',
    icon: 'pi pi-users',
    path: 'team',
    group: 'administration',
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
    group: 'administration',
    permissions: [ORGANIZATION_PERMISSION.LEGAL_PROFILE_WRITE],
  },
];

/**
 * Constant ORGANIZATION_NAVIGATION_GROUPS
 *
 * @description
 * Ordered organization navigation sections. The navigation provider and the
 * organization context panel both render items grouped by these sections, so
 * the grouping stays consistent across the primary sidebar and the context bar.
 *
 * @since 1.1.0
 */
export const ORGANIZATION_NAVIGATION_GROUPS: ReadonlyArray<OrganizationNavigationGroup> = [
  { id: 'overview', label: 'Overview' },
  { id: 'field-work', label: 'Field work' },
  { id: 'assets', label: 'Assets' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'administration', label: 'Administration' },
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

/**
 * Function buildOrganizationNavigationSection
 *
 * @description
 * Builds a single organization navigation section from its group, resolving
 * the permission-visible items and prefixing every route with the active
 * organization path. Returns `null` when no item in the group is accessible.
 *
 * @param {OrganizationNavigationGroup} group - Section to build.
 * @param {string} prefix - Active organization route prefix.
 * @param {ReadonlySet<string>} grantedPermissions - Active member permissions.
 *
 * @returns {MenuItem | null} Section menu item or null when empty.
 *
 * @since 1.1.0
 */
export function buildOrganizationNavigationSection(
  group: OrganizationNavigationGroup,
  prefix: string,
  grantedPermissions: ReadonlySet<string>,
): MenuItem | null {
  const items: MenuItem[] = ORGANIZATION_NAVIGATION_ITEMS.filter(
    (item: OrganizationNavigationItem): boolean =>
      item.group === group.id && hasOrganizationNavigationAccess(item, grantedPermissions),
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
    id: group.id,
    label: group.label,
    expanded: true,
    items,
  };
}

/**
 * Function buildOrganizationNavigationSections
 *
 * @description
 * Builds the full ordered list of organization navigation sections, dropping
 * groups with no permission-visible items.
 *
 * @param {string} prefix - Active organization route prefix.
 * @param {ReadonlySet<string>} grantedPermissions - Active member permissions.
 *
 * @returns {MenuItem[]} Ordered, non-empty navigation sections.
 *
 * @since 1.1.0
 */
export function buildOrganizationNavigationSections(
  prefix: string,
  grantedPermissions: ReadonlySet<string>,
): MenuItem[] {
  return ORGANIZATION_NAVIGATION_GROUPS.map((group: OrganizationNavigationGroup): MenuItem | null =>
    buildOrganizationNavigationSection(group, prefix, grantedPermissions),
  ).filter((section: MenuItem | null): section is MenuItem => section !== null);
}
