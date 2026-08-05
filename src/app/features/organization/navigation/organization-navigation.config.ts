import {
  ORGANIZATION_PERMISSION,
  type OrganizationPermissionName,
} from '@features/organization/models';

/**
 * Type OrganizationNavigationMatch
 *
 * @description
 * Whether all or only one of an item's permissions must be granted before the
 * item becomes reachable.
 *
 * @since 1.0.0
 */
export type OrganizationNavigationMatch = 'all' | 'any';

/**
 * Type OrganizationNavigationGroupId
 *
 * @description
 * The section an item belongs to. Groups split the navigation into meaningful
 * sections instead of one catch-all list.
 *
 * @since 1.1.0
 */
export type OrganizationNavigationGroupId = 'operations' | 'assets' | 'administration';

/**
 * Interface OrganizationNavigationGroup
 *
 * @description
 * An ordered navigation section and its heading.
 *
 * @since 1.1.0
 */
export interface OrganizationNavigationGroup {
  readonly id: OrganizationNavigationGroupId;
  readonly label: string;
}

/**
 * Interface OrganizationNavigationItem
 *
 * @description
 * One organization-owned destination and the permissions that expose it. The
 * icon is a registered lucide name, resolved by the rendering component.
 *
 * @since 1.0.0
 */
export interface OrganizationNavigationItem {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly path: string;
  readonly group: OrganizationNavigationGroupId;
  readonly permissions: ReadonlyArray<OrganizationPermissionName>;
  readonly match?: OrganizationNavigationMatch;
}

/**
 * Interface OrganizationNavigationLink
 *
 * @description
 * A resolved destination: the item with its route already prefixed by the
 * active organization, ready for `routerLink`.
 *
 * @since 2.0.0
 */
export interface OrganizationNavigationLink {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly route: string;
}

/**
 * Interface OrganizationNavigationSection
 *
 * @description
 * A group and the links inside it that the active member may actually reach.
 *
 * @since 2.0.0
 */
export interface OrganizationNavigationSection {
  readonly id: OrganizationNavigationGroupId;
  readonly label: string;
  readonly links: ReadonlyArray<OrganizationNavigationLink>;
}

/**
 * Constant ORGANIZATION_NAVIGATION_ITEMS
 *
 * @description
 * Canonical ordered list of organization destinations gated by organization-member
 * RBAC. The sidebar navigation and the landing guard both consume this list, so
 * route visibility and fallback behavior cannot diverge. The audit log is
 * deliberately absent: it is gated by the global `audit.read` account permission
 * and lives outside organization scope.
 *
 * @since 1.0.0
 */
export const ORGANIZATION_NAVIGATION_ITEMS: ReadonlyArray<OrganizationNavigationItem> = [
  {
    /**
     * The organization's home. It shows work queues to whoever can read
     * interventions and the alert strip to whoever can read the dashboard, so
     * either permission earns the entry — the landing route itself is guarded
     * by membership, not by a permission.
     */
    id: 'today',
    label: $localize`:@@route.today:Today`,
    icon: 'lucideInbox',
    path: '',
    group: 'operations',
    permissions: [
      ORGANIZATION_PERMISSION.INTERVENTIONS_READ,
      ORGANIZATION_PERMISSION.DASHBOARD_READ,
    ],
    match: 'any',
  },
  {
    id: 'interventions',
    label: $localize`:@@route.interventions:Interventions`,
    icon: 'lucideCompass',
    path: 'interventions',
    group: 'operations',
    permissions: [ORGANIZATION_PERMISSION.INTERVENTIONS_READ],
  },
  {
    id: 'inspections',
    label: $localize`:@@route.inspections:Inspections`,
    icon: 'lucideClipboardList',
    path: 'inspections',
    group: 'operations',
    permissions: [ORGANIZATION_PERMISSION.INSPECTION_READ],
  },
  {
    /**
     * One destination for the estate, replacing the separate "Facilities" and
     * "Equipments" entries. Sites, equipment and inspections are one business
     * chain, and two menu entries presented them as two independent catalogues.
     *
     * Gated on the facilities permission because the explorer opens on the site
     * hierarchy; the equipment pane inside it is gated separately.
     */
    id: 'assets',
    label: $localize`:@@route.assets:Assets`,
    icon: 'lucideNetwork',
    path: 'assets',
    group: 'assets',
    permissions: [ORGANIZATION_PERMISSION.FACILITIES_READ],
  },
  {
    id: 'statistics',
    label: $localize`:@@route.statistics:Statistics`,
    icon: 'lucideChartColumn',
    path: 'statistics',
    group: 'assets',
    permissions: [ORGANIZATION_PERMISSION.DASHBOARD_READ],
    match: 'all',
  },
  {
    id: 'members',
    label: $localize`:@@route.members:Members`,
    icon: 'lucideUsers',
    path: 'members',
    group: 'administration',
    permissions: [ORGANIZATION_PERMISSION.MEMBERS_READ, ORGANIZATION_PERMISSION.MEMBERS_MANAGE],
    match: 'any',
  },
  {
    id: 'team',
    label: $localize`:@@route.team:Team`,
    icon: 'lucideIdCard',
    path: 'team',
    group: 'administration',
    permissions: [ORGANIZATION_PERMISSION.ROLES_READ, ORGANIZATION_PERMISSION.ROLES_MANAGE],
    match: 'any',
  },
  {
    id: 'settings',
    label: $localize`:@@route.settings:Settings`,
    icon: 'lucideSettings',
    path: 'settings',
    group: 'administration',
    permissions: [ORGANIZATION_PERMISSION.SETTINGS_WRITE],
  },
];

/**
 * Constant ORGANIZATION_NAVIGATION_GROUPS
 *
 * @description
 * Ordered navigation sections, rendered in this order in the sidebar.
 *
 * @since 1.1.0
 */
export const ORGANIZATION_NAVIGATION_GROUPS: ReadonlyArray<OrganizationNavigationGroup> = [
  { id: 'operations', label: $localize`:@@org.navGroup.operations:Operations` },
  { id: 'assets', label: $localize`:@@org.navGroup.assets:Assets` },
  { id: 'administration', label: $localize`:@@org.navGroup.administration:Administration` },
];

/**
 * Function matchesOrganizationPermission
 *
 * @description
 * Checks an exact permission or a namespace wildcard grant such as `organization.*`.
 *
 * @param {string} grantedPermission - Permission granted to the active member.
 * @param {OrganizationPermissionName} requiredPermission - Permission the destination requires.
 *
 * @returns {boolean} Whether the grant satisfies the requirement.
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
 * Evaluates one item's permission contract against the active member's grants.
 *
 * @param {OrganizationNavigationItem} item - Destination to evaluate.
 * @param {ReadonlySet<string>} grantedPermissions - Active member permissions.
 *
 * @returns {boolean} Whether the destination is reachable.
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
 * Function buildOrganizationNavigation
 *
 * @description
 * Resolves the whole navigation for one organization: every section holding at
 * least one destination the member may reach, with routes already prefixed. A
 * section whose items are all denied is dropped rather than rendered empty.
 *
 * @param {string} organizationId - The active organization.
 * @param {ReadonlySet<string>} grantedPermissions - Active member permissions.
 *
 * @returns {ReadonlyArray<OrganizationNavigationSection>} The sections to render.
 *
 * @since 2.0.0
 */
export function buildOrganizationNavigation(
  organizationId: string,
  grantedPermissions: ReadonlySet<string>,
): ReadonlyArray<OrganizationNavigationSection> {
  const prefix = `/organizations/${organizationId}`;

  return ORGANIZATION_NAVIGATION_GROUPS.map(
    (group: OrganizationNavigationGroup): OrganizationNavigationSection => ({
      id: group.id,
      label: group.label,
      links: ORGANIZATION_NAVIGATION_ITEMS.filter(
        (item: OrganizationNavigationItem): boolean =>
          item.group === group.id && hasOrganizationNavigationAccess(item, grantedPermissions),
      ).map((item: OrganizationNavigationItem): OrganizationNavigationLink => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
        route: item.path.length > 0 ? `${prefix}/${item.path}` : prefix,
      })),
    }),
  ).filter((section: OrganizationNavigationSection): boolean => section.links.length > 0);
}
