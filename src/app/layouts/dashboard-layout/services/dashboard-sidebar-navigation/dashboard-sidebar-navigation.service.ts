import { computed, inject, Injectable, Signal, signal, WritableSignal } from '@angular/core';
import { NOTIFICATION_CENTER_PORT, type NotificationCenterPort } from '@features/account/ports';
import {
  ORGANIZATION_PERMISSION,
  type OrganizationPermissionName,
} from '@features/organization/models';
import type { MenuItem } from 'primeng/api';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
  type OrganizationContextPort,
  type OrganizationMemberAccessPort,
} from '@features/organization/ports';

type StaticSidebarNavigationItem = Readonly<{
  id: string;
  label: string;
  icon: string;
  routerLink: string;
}>;

type OrganizationSidebarNavigationItem = Readonly<{
  id: string;
  label: string;
  icon: string;
  path: string;
  permissions: ReadonlyArray<OrganizationPermissionName>;
}>;

const HOME_NAVIGATION_ITEMS: ReadonlyArray<StaticSidebarNavigationItem> = [
  {
    id: 'home',
    label: 'Home',
    icon: 'pi pi-home',
    routerLink: '/',
  },
  {
    id: 'organizations',
    label: 'Organizations',
    icon: 'pi pi-sitemap',
    routerLink: '/organizations',
  },
];

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

const ACCOUNT_NAVIGATION_ITEMS: ReadonlyArray<StaticSidebarNavigationItem> = [
  {
    id: 'notifications',
    label: 'Notifications',
    icon: 'pi pi-bell',
    routerLink: '/account/notifications',
  },
];

/**
 * Service DashboardSidebarNavigationService
 * @class DashboardSidebarNavigationService
 *
 * @description
 * Layout-scoped service managing sidebar navigation items
 * and search filtering logic.
 *
 * Menu items are built dynamically so that every `routerLink`
 * is prefixed with `/organizations/{currentOrgId}`.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable()
export class DashboardSidebarNavigationService {
  //#region Properties
  /**
   * Property organizationContext
   * @readonly
   *
   * @description
   * Organization context port for accessing the
   * currently selected organization and prefixing sidebar
   * links with the correct organization path.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {OrganizationContextPort}
   */
  private readonly organizationContext: OrganizationContextPort = inject(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property organizationMemberAccess
   * @readonly
   *
   * @description
   * Published organization member access port used by the layout to derive
   * organization-scoped navigation visibility without depending on feature
   * internals.
   *
   * @access private
   * @since 2.1.0
   *
   * @type {OrganizationMemberAccessPort}
   */
  private readonly organizationMemberAccess: OrganizationMemberAccessPort = inject(
    ORGANIZATION_MEMBER_ACCESS_PORT,
  );

  /**
   * Property notificationCenter
   * @readonly
   *
   * @description
   * Published notification center port used to surface the unread count in
   * the account navigation section.
   *
   * @access private
   * @since 2.1.0
   *
   * @type {NotificationCenterPort}
   */
  private readonly notificationCenter: NotificationCenterPort = inject(NOTIFICATION_CENTER_PORT);

  /**
   * Property _searchQuery
   * @readonly
   *
   * @description
   * Internal writable signal storing the current
   * sidebar navigation search query.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  private readonly _searchQuery: WritableSignal<string> = signal<string>('');

  /**
   * Property searchQuery
   * @readonly
   *
   * @description
   * Read-only search query signal consumed by the sidebar UI.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  public readonly searchQuery: Signal<string> = this._searchQuery.asReadonly();

  /**
   * Property menuItems
   * @readonly
   *
   * @description
  * Sidebar menu items filtered by current search query.
  * Organization-scoped routes are prefixed with the active organization path
  * and hidden when the current member lacks the required permission.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  public readonly menuItems: Signal<MenuItem[]> = computed<MenuItem[]>((): MenuItem[] => {
    const organization = this.organizationContext.selectedOrganization();
    const query: string = this.searchQuery().trim();
    const unreadCount: number = this.notificationCenter.unreadCount();
    const grantedPermissionSet: ReadonlySet<string> = new Set(
      this.organizationMemberAccess.permissions(),
    );

    const items: MenuItem[] = [
      {
        id: 'home',
        label: 'Home',
        expanded: true,
        items: HOME_NAVIGATION_ITEMS.map((item: StaticSidebarNavigationItem): MenuItem => ({
          ...item,
        })),
      },
      this.buildOrganizationSection(organization?.id ?? null, grantedPermissionSet),
      {
        id: 'account',
        label: 'Account',
        expanded: true,
        items: ACCOUNT_NAVIGATION_ITEMS.map((item: StaticSidebarNavigationItem): MenuItem => ({
          ...item,
          badge: unreadCount > 0 ? String(unreadCount) : undefined,
        })),
      },
    ].filter((item: MenuItem | null): item is MenuItem => item !== null);

    if (!query) return [...items];
    return this.filterMenuItems(items, query);
  });

  /**
   * Property primaryItems
   * @readonly
   *
   * @description
   * Navigation items for the primary (always-visible) sidebar.
   * Contains the Home and Account sections independently of any
   * active organization. Not filtered by the search query since
   * these entries are few and always accessible.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  public readonly primaryItems: Signal<MenuItem[]> = computed<MenuItem[]>((): MenuItem[] => {
    const unreadCount: number = this.notificationCenter.unreadCount();

    return [
      {
        id: 'home',
        label: 'Home',
        expanded: true,
        items: HOME_NAVIGATION_ITEMS.map((item: StaticSidebarNavigationItem): MenuItem => ({
          ...item,
        })),
      },
      {
        id: 'account',
        label: 'Account',
        expanded: true,
        items: ACCOUNT_NAVIGATION_ITEMS.map((item: StaticSidebarNavigationItem): MenuItem => ({
          ...item,
          badge: unreadCount > 0 ? String(unreadCount) : undefined,
        })),
      },
    ];
  });

  /**
   * Property secondaryItems
   * @readonly
   *
   * @description
   * Organization-scoped navigation items for the secondary
   * (contextual) sidebar. Contains the Organization section only,
   * filtered by the current search query and member permissions.
   * Returns an empty array when no organization is active.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  public readonly secondaryItems: Signal<MenuItem[]> = computed<MenuItem[]>((): MenuItem[] => {
    const organization = this.organizationContext.selectedOrganization();
    const query: string = this.searchQuery().trim();
    const grantedPermissionSet: ReadonlySet<string> = new Set(
      this.organizationMemberAccess.permissions(),
    );

    const section: MenuItem | null = this.buildOrganizationSection(
      organization?.id ?? null,
      grantedPermissionSet,
    );

    if (section === null) return [];

    const items: MenuItem[] = [section];
    if (!query) return items;
    return this.filterMenuItems(items, query);
  });

  /**
   * Property isOrganizationContextActive
   * @readonly
   *
   * @description
   * Whether an organization context is currently active.
   * Consumed by the layout shell to conditionally render
   * the secondary sidebar.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {Signal<boolean>}
   */
  public readonly isOrganizationContextActive: Signal<boolean> = computed<boolean>(
    (): boolean => this.organizationContext.selectedOrganization() !== null,
  );
  //#endregion

  //#region Methods
  /**
   * Method setSearchQuery
   * @method setSearchQuery
   *
   * @description
   * Updates the sidebar search query.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} query - Search input value.
   *
   * @returns {void}
   */
  public setSearchQuery(query: string): void {
    this._searchQuery.set(query);
  }

  /**
   * Method clearSearchQuery
   * @method clearSearchQuery
   *
   * @description
   * Clears the sidebar search query.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public clearSearchQuery(): void {
    this._searchQuery.set('');
  }

  /**
   * Method buildOrganizationSection
   * @method buildOrganizationSection
   *
   * @description
   * Builds the organization-scoped section when an active organization exists
   * and the current member has at least one matching permission.
   *
   * @access private
   * @since 2.1.0
   *
   * @param {string | null} organizationId - Active organization identifier.
   * @param {ReadonlySet<string>} grantedPermissionSet - Granted permissions for the active member.
   *
   * @returns {MenuItem | null} Organization section or `null` when unavailable.
   */
  private buildOrganizationSection(
    organizationId: string | null,
    grantedPermissionSet: ReadonlySet<string>,
  ): MenuItem | null {
    if (organizationId === null) {
      return null;
    }

    const prefix: string = `/organizations/${organizationId}`;
    const items: MenuItem[] = ORGANIZATION_NAVIGATION_ITEMS.filter(
      (item: OrganizationSidebarNavigationItem): boolean =>
        this.hasAllOrganizationPermissions(item.permissions, grantedPermissionSet),
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
   * Method hasAllOrganizationPermissions
   * @method hasAllOrganizationPermissions
   *
   * @description
   * Returns whether every required organization-scoped permission is granted,
   * including wildcard permissions such as `organization.*`.
   *
   * @access private
   * @since 2.1.0
   *
   * @param {ReadonlyArray<OrganizationPermissionName>} permissions - Required permissions.
   * @param {ReadonlySet<string>} grantedPermissionSet - Granted permissions.
   *
   * @returns {boolean} `true` when all permissions are granted.
   */
  private hasAllOrganizationPermissions(
    permissions: ReadonlyArray<OrganizationPermissionName>,
    grantedPermissionSet: ReadonlySet<string>,
  ): boolean {
    return permissions.every((permission: OrganizationPermissionName): boolean =>
      this.hasGrantedPermission(permission, grantedPermissionSet),
    );
  }

  /**
   * Method hasGrantedPermission
   * @method hasGrantedPermission
   *
   * @description
   * Evaluates whether the provided granted permission set satisfies the
   * required organization-scoped permission, including wildcard grants.
   *
   * @access private
   * @since 2.1.0
   *
   * @param {OrganizationPermissionName} permission - Required permission.
   * @param {ReadonlySet<string>} grantedPermissionSet - Granted permissions.
   *
   * @returns {boolean} `true` when the permission is granted.
   */
  private hasGrantedPermission(
    permission: OrganizationPermissionName,
    grantedPermissionSet: ReadonlySet<string>,
  ): boolean {
    if (grantedPermissionSet.has(permission)) {
      return true;
    }

    return Array.from(grantedPermissionSet).some((grantedPermission: string): boolean =>
      this.matchesPermissionName(grantedPermission, permission),
    );
  }

  /**
   * Method matchesPermissionName
   * @method matchesPermissionName
   *
   * @description
   * Evaluates whether a granted permission satisfies a required permission,
   * including wildcard permissions such as `organization.*`.
   *
   * @access private
   * @since 2.1.0
   *
   * @param {string} grantedPermission - Granted permission name.
   * @param {OrganizationPermissionName} requiredPermission - Required permission name.
   *
   * @returns {boolean} `true` when the grant satisfies the requirement.
   */
  private matchesPermissionName(
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

  /**
   * Method filterMenuItems
   * @method filterMenuItems
   *
   * @description
   * Recursively filters menu items by label while keeping
   * parent nodes when a child matches.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {readonly MenuItem[]} items - Source menu items.
   * @param {string} query - Search query.
   *
   * @returns {MenuItem[]} Filtered menu items.
   */
  private filterMenuItems(items: readonly MenuItem[], query: string): MenuItem[] {
    return items
      .map((item: MenuItem): MenuItem | null => {
        const filteredChildren: MenuItem[] = item.items
          ? this.filterMenuItems(item.items, query)
          : [];
        const itemMatches: boolean = (item.label ?? '').includes(query);

        if (!itemMatches && filteredChildren.length === 0) return null;

        return {
          ...item,
          expanded: filteredChildren.length > 0 ? true : item.expanded,
          items: filteredChildren.length > 0 ? filteredChildren : undefined,
        };
      })
      .filter((item: MenuItem | null): item is MenuItem => item !== null);
  }
  //#endregion
}
