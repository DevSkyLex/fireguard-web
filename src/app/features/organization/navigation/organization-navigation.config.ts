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
 * Type OrganizationNavigationCounterKey
 *
 * @description
 * A navigation-counters field an item's row may badge. Resolved to a live
 * value by `OrganizationNav` from `OrganizationNavigationCountersStore` —
 * this config stays permission-only and knows no counts itself.
 *
 * @since 3.1.0
 */
export type OrganizationNavigationCounterKey = 'submittedInterventions';

/**
 * Type OrganizationNavigationGroupId
 *
 * @description
 * The section an item belongs to. Groups split the navigation into meaningful
 * sections instead of one catch-all list.
 *
 * @since 1.1.0
 */
export type OrganizationNavigationGroupId = 'operations' | 'assets';

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
  readonly counterKey?: OrganizationNavigationCounterKey;
  readonly exact?: boolean;
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
  readonly counterKey?: OrganizationNavigationCounterKey;
  readonly exact: boolean;
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
 * RBAC. Only the sidebar navigation consumes it — an earlier revision of this
 * doc claimed the landing guard did too, which was never true and is worth not
 * believing: guard and navigation are gated independently.
 *
 * `exact` marks the one entry whose `path` is empty, so `routerLinkActive`
 * matches the workspace root exactly instead of as a prefix of every sibling
 * route. Declaring it here rather than inferring it from an id is what stops a
 * rename from silently marking that row active on every page — which is
 * precisely what happened when `today` became `dashboard`.
 *
 * @since 1.0.0
 */
export const ORGANIZATION_NAVIGATION_ITEMS: ReadonlyArray<OrganizationNavigationItem> = [
  {
    /**
     * The organization's home: the merged Dashboard page, combining the
     * retired Today and Statistics pages into one tabbed surface
     * (`FEATURE.md`). It shows the Overview tab's work queues to whoever can
     * read interventions and the Trends tab's KPIs/charts to whoever can
     * read the dashboard, so either permission earns the entry — the
     * landing route itself is guarded by membership, not by a permission.
     */
    id: 'dashboard',
    label: $localize`:@@route.dashboard:Dashboard`,
    icon: 'lucideLayoutDashboard',
    path: '',
    group: 'operations',
    permissions: [
      ORGANIZATION_PERMISSION.INTERVENTIONS_READ,
      ORGANIZATION_PERMISSION.DASHBOARD_READ,
    ],
    match: 'any',
    exact: true,
  },
  {
    id: 'interventions',
    label: $localize`:@@route.interventions:Interventions`,
    icon: 'lucideCompass',
    path: 'interventions',
    group: 'operations',
    permissions: [ORGANIZATION_PERMISSION.INTERVENTIONS_READ],
    counterKey: 'submittedInterventions',
  },
  {
    id: 'calendar',
    label: $localize`:@@route.calendar:Calendar`,
    icon: 'lucideCalendarDays',
    path: 'calendar',
    group: 'operations',
    permissions: [ORGANIZATION_PERMISSION.EVENTS_READ],
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
    id: 'checklists',
    label: $localize`:@@route.checklists:Checklists`,
    icon: 'lucideListChecks',
    path: 'checklists',
    group: 'operations',
    permissions: [ORGANIZATION_PERMISSION.INSPECTION_READ],
  },
  {
    id: 'maintenance',
    label: $localize`:@@route.maintenance:Maintenance`,
    icon: 'lucideWrench',
    path: 'maintenance',
    group: 'operations',
    permissions: [ORGANIZATION_PERMISSION.MAINTENANCE_READ],
  },
  {
    /**
     * The four-eyes decision surface for the backend Approval module. No
     * nav counter badge: the backend navigation-counters endpoint has no
     * approvals count, and this list does not fake one client-side.
     */
    id: 'approvals',
    label: $localize`:@@route.approvals:Approvals`,
    icon: 'lucideShieldCheck',
    path: 'approvals',
    group: 'operations',
    permissions: [ORGANIZATION_PERMISSION.APPROVALS_READ],
  },
  {
    /**
     * The estate explorer is the sidebar's single assets entry, replacing the
     * interim `facilities`/`equipments` pair (`organization/FEATURE.md`
     * "assets"). Both route trees stay mounted regardless, so records,
     * creation forms and deep links keep resolving.
     */
    id: 'assets',
    label: $localize`:@@route.assets:Assets`,
    icon: 'lucideNetwork',
    path: 'assets',
    group: 'assets',
    permissions: [ORGANIZATION_PERMISSION.FACILITIES_READ],
  },
  {
    /**
     * The bulk CSV import surface for equipment and facilities. Gated on
     * either read permission (`match: 'any'`) so a reader holding only one
     * still reaches the page and imports that one kind — the backend's own
     * `create` gate (`EQUIPMENT_WRITE`/`FACILITIES_WRITE` per submitted
     * `kind`) is the actual write floor.
     */
    id: 'imports',
    label: $localize`:@@route.imports:Imports`,
    icon: 'lucideUpload',
    path: 'imports',
    group: 'assets',
    permissions: [ORGANIZATION_PERMISSION.EQUIPMENT_READ, ORGANIZATION_PERMISSION.FACILITIES_READ],
    match: 'any',
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
        counterKey: item.counterKey,
        exact: item.exact ?? false,
      })),
    }),
  ).filter((section: OrganizationNavigationSection): boolean => section.links.length > 0);
}
