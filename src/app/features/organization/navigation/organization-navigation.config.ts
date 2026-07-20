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
 * Identifies the cluster a navigation item belongs to. The prototype's sidebar
 * has exactly two: the flat business navigation (`workspace`) and the
 * workspace utilities below it (`utilities`) — assistant, inbox, messaging
 * entry points. Neither renders a section header.
 *
 * @since 1.1.0
 */
export type OrganizationNavigationGroupId = 'workspace' | 'utilities';

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
 * Canonical ordered list of organization destinations gated by
 * organization-member RBAC. The dashboard navigation provider and the
 * organization landing guard both consume this list so route visibility and
 * fallback behavior cannot diverge.
 *
 * The list mirrors the collaboration prototype's flat sidebar. Members, Roles,
 * Settings and the audit log are deliberately absent: they are settings child
 * routes now, reached through the sidebar header's cog and the settings
 * vertical navigation. Inspections is the one addition over the prototype's
 * eight entries — it is a distinct permission (`inspection.read`) and hiding
 * it would strand members who hold only that grant.
 *
 * @since 1.0.0
 */
export const ORGANIZATION_NAVIGATION_ITEMS: ReadonlyArray<OrganizationNavigationItem> = [
  {
    id: 'dashboard',
    label: $localize`:@@org.nav.overview:Overview`,
    icon: 'pi pi-th-large',
    path: '',
    group: 'workspace',
    permissions: [ORGANIZATION_PERMISSION.DASHBOARD_READ],
  },
  /**
   * Intervention workspace entry for field preparation and publication flows.
   * Hosts both the planner table and the scheduling calendar through its own
   * `?view=` switch, so the calendar no longer needs a separate destination.
   */
  {
    id: 'interventions',
    label: $localize`:@@route.interventions:Interventions`,
    icon: 'pi pi-bolt',
    path: 'interventions',
    group: 'workspace',
    permissions: [ORGANIZATION_PERMISSION.INTERVENTIONS_READ],
  },
  {
    id: 'facilities',
    label: $localize`:@@route.facilities:Facilities`,
    icon: 'pi pi-sitemap',
    path: 'facilities',
    group: 'workspace',
    permissions: [ORGANIZATION_PERMISSION.FACILITIES_READ],
  },
  {
    id: 'map',
    label: $localize`:@@route.map:Map`,
    icon: 'pi pi-map',
    path: 'map',
    group: 'workspace',
    permissions: [ORGANIZATION_PERMISSION.FACILITIES_READ],
  },
  {
    id: 'calendar',
    label: $localize`:@@route.calendar:Calendar`,
    icon: 'pi pi-calendar',
    path: 'calendar',
    group: 'workspace',
    permissions: [ORGANIZATION_PERMISSION.EVENTS_READ],
  },
  {
    id: 'equipments',
    label: $localize`:@@route.equipments:Equipments`,
    icon: 'pi pi-box',
    path: 'equipments',
    group: 'workspace',
    permissions: [ORGANIZATION_PERMISSION.EQUIPMENT_READ],
  },
  {
    id: 'inspections',
    label: $localize`:@@route.inspections:Inspections`,
    icon: 'pi pi-clipboard',
    path: 'inspections',
    group: 'workspace',
    permissions: [ORGANIZATION_PERMISSION.INSPECTION_READ],
  },
  {
    id: 'compliance',
    label: $localize`:@@route.compliance:Compliance`,
    icon: 'pi pi-verified',
    path: 'compliance',
    group: 'workspace',
    permissions: [ORGANIZATION_PERMISSION.COMPLIANCE_READ],
  },
  {
    id: 'billing',
    label: $localize`:@@route.billing:Billing`,
    icon: 'pi pi-credit-card',
    path: 'billing',
    group: 'workspace',
    permissions: [ORGANIZATION_PERMISSION.SETTINGS_WRITE],
  },
  {
    id: 'assistant',
    label: $localize`:@@route.assistant:Assistant`,
    icon: 'pi pi-sparkles',
    path: 'assistant',
    group: 'utilities',
    permissions: [ORGANIZATION_PERMISSION.ASSISTANT_USE],
  },
  {
    id: 'drafts',
    label: $localize`:@@route.drafts:Drafts`,
    icon: 'pi pi-file-edit',
    path: 'messages/drafts',
    group: 'utilities',
    permissions: [ORGANIZATION_PERMISSION.MESSAGING_READ],
  },
  {
    id: 'saved',
    label: $localize`:@@route.saved:Saved items`,
    icon: 'pi pi-bookmark',
    path: 'messages/saved',
    group: 'utilities',
    permissions: [ORGANIZATION_PERMISSION.MESSAGING_READ],
  },
  /**
   * The unified inbox is an account surface (`InboxItem.organizationId` is
   * nullable), so its path is absolute and it carries no organization
   * permission: every member has an inbox. The landing guard skips
   * absolute-path items when picking a fallback destination.
   */
  {
    id: 'inbox',
    label: $localize`:@@route.inbox:Inbox`,
    icon: 'pi pi-inbox',
    path: '/account/inbox',
    group: 'utilities',
    permissions: [],
  },
  {
    id: 'messages',
    label: $localize`:@@org.nav.directMessages:Direct messages`,
    icon: 'pi pi-comments',
    path: 'messages',
    group: 'utilities',
    permissions: [ORGANIZATION_PERMISSION.MESSAGING_READ],
  },
];

/**
 * Constant ORGANIZATION_NAVIGATION_GROUPS
 *
 * @description
 * Ordered organization navigation clusters. Both are headerless — the
 * prototype's sidebar separates them by spacing alone, so the labels stay
 * empty and the sidebar renders no section title.
 *
 * @since 1.1.0
 */
export const ORGANIZATION_NAVIGATION_GROUPS: ReadonlyArray<OrganizationNavigationGroup> = [
  { id: 'workspace', label: '' },
  { id: 'utilities', label: '' },
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
      routerLink: resolveOrganizationNavigationLink(item, prefix),
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
 * Function resolveOrganizationNavigationLink
 *
 * @description
 * Resolves an item's router link. An absolute path (leading `/`) is an
 * app-level destination — the unified inbox — and is used verbatim; a relative
 * path is joined onto the active organization prefix.
 *
 * @param {OrganizationNavigationItem} item - Navigation item to resolve.
 * @param {string} prefix - Active organization route prefix.
 *
 * @returns {string} Router link for the item.
 *
 * @since 1.3.0
 */
export function resolveOrganizationNavigationLink(
  item: OrganizationNavigationItem,
  prefix: string,
): string {
  if (item.path.startsWith('/')) {
    return item.path;
  }

  return item.path.length > 0 ? `${prefix}/${item.path}` : prefix;
}
