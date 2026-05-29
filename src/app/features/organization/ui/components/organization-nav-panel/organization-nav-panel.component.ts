import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type Signal,
} from '@angular/core';
import { type IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { RippleModule } from 'primeng/ripple';
import { OrganizationOutput } from '@app/features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
  ORGANIZATION_PERMISSION,
  type OrganizationContextPort,
  type OrganizationMemberAccessPort,
  type OrganizationPermissionName,
} from '@features/organization';

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
 * Organization-owned navigation panel rendered in the dashboard secondary
 * sidebar slot when an organization is active. Displays organization-scoped
 * navigation items (Dashboard, Facilities, Equipments, Inspections) filtered
 * by the current member's permissions.
 *
 * This component is feature-owned, manages its own state, and is registered
 * as a slot contribution by `provideOrganization()`. Its design is
 * intentionally independent from the primary sidebar.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-nav-panel',
  imports: [RippleModule, RouterLink, RouterLinkActive],
  templateUrl: './organization-nav-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationNavPanel {
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
   * Property selectedOrganization
   * @readonly
   *
   * @description
   * Currently active organization exposed to the template for the panel header.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<OrganizationOutput | null>}
   */
  protected readonly selectedOrganization: Signal<OrganizationOutput | null> = computed(
    (): OrganizationOutput | null => this.organizationContext.selectedOrganization(),
  );

  /**
   * Property navigationItems
   * @readonly
   *
   * @description
    * Organization-scoped navigation items filtered by the current member's
    * permissions. Returns an empty array when no organization is active
    * or no items pass the permission filter.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly navigationItems: Signal<MenuItem[]> = computed<MenuItem[]>((): MenuItem[] => {
    const organization: OrganizationOutput | null = this.organizationContext.selectedOrganization();

    if (organization === null) return [];

    const grantedPermissions: ReadonlySet<string> = new Set(
      this.organizationMemberAccess.permissions(),
    );
    const prefix: string = `/organizations/${organization.id}`;

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

    return [
      {
        id: 'organization',
        label: 'Organization',
        expanded: true,
        items: visibleItems,
      },
    ];
  });

  /**
   * Property exactMatchOptions
   * @readonly
   *
   * @description
   * Router active options for exact route matching (used for root `/`).
   *
   * @access private
   * @since 1.0.0
   *
   * @type {IsActiveMatchOptions}
   */
  private readonly exactMatchOptions: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  };

  /**
   * Property subsetMatchOptions
   * @readonly
   *
   * @description
   * Router active options for non-root route matching.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {IsActiveMatchOptions}
   */
  private readonly subsetMatchOptions: IsActiveMatchOptions = {
    paths: 'subset',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  };
  //#endregion

  //#region Methods
  /**
   * Method getRouterLinkActiveOptions
   * @method getRouterLinkActiveOptions
   *
   * @description
   * Returns active route matching options based on the item's route.
   * Root route uses exact matching to avoid being active on all URLs.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MenuItem['routerLink']} routerLink - Navigation item route.
   *
   * @returns {IsActiveMatchOptions}
   */
  protected getRouterLinkActiveOptions(routerLink: MenuItem['routerLink']): IsActiveMatchOptions {
    if (typeof routerLink === 'string' && routerLink === '/') {
      return this.exactMatchOptions;
    }

    return this.subsetMatchOptions;
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

  //#endregion
}
