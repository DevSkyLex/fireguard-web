import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { type IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';
import type { MotionOptions } from '@primeuix/motion';
import type { MenuItem } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { DividerModule } from 'primeng/divider';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { PanelMenuModule, type PanelMenuPassThroughOptions } from 'primeng/panelmenu';
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
 * by the current member's permissions and a local search query.
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
  imports: [
    BadgeModule,
    DividerModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    PanelMenuModule,
    RippleModule,
    RouterLink,
    RouterLinkActive,
  ],
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
   * Local search query used to filter organization navigation items.
   */
  private readonly searchQuery: WritableSignal<string> = signal<string>('');

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
  protected readonly navigationItems: Signal<MenuItem[]> = computed<MenuItem[]>((): MenuItem[] => {
    const organization: OrganizationOutput | null = this.organizationContext.selectedOrganization();

    if (organization === null) return [];

    const grantedPermissions: ReadonlySet<string> = new Set(
      this.organizationMemberAccess.permissions(),
    );
    const prefix: string = `/organizations/${organization.id}`;
    const query: string = this.searchQuery().trim().toLowerCase();

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

    const filteredItems: MenuItem[] = query
      ? visibleItems.filter(
          (item: MenuItem): boolean => item.label?.toLowerCase().includes(query) ?? false,
        )
      : visibleItems;

    if (filteredItems.length === 0) return [];

    return [
      {
        id: 'organization',
        label: 'Organization',
        expanded: true,
        items: filteredItems,
      },
    ];
  });

  /**
   * Property panelMenuPt
   * @readonly
   *
   * @description
   * Pass-through options for PrimeNG PanelMenu.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {PanelMenuPassThroughOptions}
   */
  protected readonly panelMenuPt: PanelMenuPassThroughOptions = {
    submenuIcon: { class: 'hidden' },
    submenu: { class: 'ml-6 border-l border-surface-200 pl-3' },
  };

  /**
   * Property panelMenuMotionOptions
   * @readonly
   *
   * @description
   * Animation options for submenu enter/leave transitions.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {MotionOptions}
   */
  protected readonly panelMenuMotionOptions: MotionOptions = {
    type: 'transition',
    autoHeight: true,
    duration: { enter: 250, leave: 200 },
    enterClass: {
      from: 'h-0 opacity-0',
      active: 'overflow-hidden transition-[height,opacity] duration-250 ease-in-out',
      to: 'h-[var(--pui-motion-height)] opacity-100',
    },
    leaveClass: {
      from: 'h-[var(--pui-motion-height)] opacity-100',
      active: 'overflow-hidden transition-[height,opacity] duration-200 ease-in-out',
      to: 'h-0 opacity-0',
    },
  };

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
  protected onSearchQueryChange(query: string): void {
    this.searchQuery.set(query);
  }

  protected onClearSearch(): void {
    this.searchQuery.set('');
  }

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
