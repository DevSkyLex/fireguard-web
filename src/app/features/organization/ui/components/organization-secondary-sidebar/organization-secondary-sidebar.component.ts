import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { MenuItem } from 'primeng/api';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
  ORGANIZATION_PERMISSION,
  type OrganizationContextPort,
  type OrganizationMemberAccessPort,
  type OrganizationPermissionName,
} from '@features/organization';
import { SidebarNavigation } from '@shared/components/sidebar-navigation';
import { OrganizationOutput } from '@app/features/organization/models';

type OrganizationSidebarItem = Readonly<{
  id: string;
  label: string;
  icon: string;
  path: string;
  permissions: ReadonlyArray<OrganizationPermissionName>;
}>;

const ORGANIZATION_NAVIGATION_ITEMS: ReadonlyArray<OrganizationSidebarItem> = [
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

/**
 * Component OrganizationSecondarySidebar
 * @class OrganizationSecondarySidebar
 *
 * @description
 * Organization-owned widget rendered in the dashboard secondary sidebar
 * slot when an organization is active. Displays organization-scoped
 * navigation items (Dashboard, Facilities, Equipments, Inspections)
 * filtered by the current member's permissions and a local search query.
 *
 * This component is feature-owned: it manages its own state, depends
 * only on organization ports, and is registered as a shell contribution
 * by `provideOrganization()`. The layout renders it dynamically via
 * `NgComponentOutlet` and does not import this class directly.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-secondary-sidebar',
  imports: [SidebarNavigation],
  templateUrl: './organization-secondary-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationSecondarySidebar {
  //#region Properties
  /**
   * Property organizationContext
   * @readonly
   *
   * @description
   * Organization context port providing the currently selected organization.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationContextPort}
   */
  private readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property organizationMemberAccess
   * @readonly
   *
   * @description
   * Organization member access port providing the granted permissions
   * for the current member.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationMemberAccessPort}
   */
  private readonly organizationMemberAccess: OrganizationMemberAccessPort =
    inject<OrganizationMemberAccessPort>(ORGANIZATION_MEMBER_ACCESS_PORT);

  /**
   * Property _searchQuery
   * @readonly
   *
   * @description
   * Internal writable signal for the local search query.
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
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly searchQuery: Signal<string> = this._searchQuery.asReadonly();

  /**
   * Property navigationItems
   * @readonly
   *
   * @description
   * Organization-scoped navigation items filtered by the current member's
   * permissions and the local search query. Returns an empty array when
   * no organization is active or no items pass the permission filter.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly navigationItems: Signal<MenuItem[]> = computed<MenuItem[]>(
    (): MenuItem[] => {
      const organization: OrganizationOutput | null = this.organizationContext.selectedOrganization();

      if (organization === null) return [];


      const grantedPermissions: ReadonlySet<string> = new Set(
        this.organizationMemberAccess.permissions(),
      );
      const prefix: string = `/organizations/${organization.id}`;
      const query: string = this._searchQuery().trim();

      const visibleItems: MenuItem[] = ORGANIZATION_NAVIGATION_ITEMS.filter(
        (item: OrganizationSidebarItem): boolean =>
          this.hasPermissions(item.permissions, grantedPermissions),
      ).map(
        (item: OrganizationSidebarItem): MenuItem => ({
          id: item.id,
          label: item.label,
          icon: item.icon,
          routerLink: item.path.length > 0 ? `${prefix}/${item.path}` : prefix,
        }),
      );

      if (visibleItems.length === 0) return [];

      const section: MenuItem = {
        id: 'organization',
        label: 'Organization',
        expanded: true,
        items: visibleItems,
      };

      if (!query) return [section];

      return this.filterMenuItems([section], query);
    },
  );
  //#endregion

  //#region Methods
  /**
   * Method onSearchQueryChange
   * @method onSearchQueryChange
   *
   * @description
   * Updates the local search query when the user types in the search field.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} query - New search query value.
   *
   * @returns {void}
   */
  protected onSearchQueryChange(query: string): void {
    this._searchQuery.set(query);
  }

  /**
   * Method hasPermissions
   * @method hasPermissions
   *
   * @description
   * Returns whether every required permission is in the granted set,
   * including wildcard grants such as `organization.*`.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {ReadonlyArray<OrganizationPermissionName>} required - Required permissions.
   * @param {ReadonlySet<string>} granted - Granted permissions.
   *
   * @returns {boolean}
   */
  private hasPermissions(
    required: ReadonlyArray<OrganizationPermissionName>,
    granted: ReadonlySet<string>,
  ): boolean {
    return required.every((permission: OrganizationPermissionName): boolean => {
      if (granted.has(permission)) return true;

      return Array.from(granted).some((grantedPermission: string): boolean => {
        if (grantedPermission === permission) return true;
        if (!grantedPermission.endsWith('.*')) return false;
        return permission.startsWith(grantedPermission.slice(0, -1));
      });
    });
  }

  /**
   * Method filterMenuItems
   * @method filterMenuItems
   *
   * @description
   * Recursively filters menu items by label while keeping parent nodes
   * when a child matches.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {readonly MenuItem[]} items - Source menu items.
   * @param {string} query - Search query.
   *
   * @returns {MenuItem[]}
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
