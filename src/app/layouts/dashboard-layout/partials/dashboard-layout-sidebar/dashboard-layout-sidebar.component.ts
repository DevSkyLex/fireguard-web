import { Component, ChangeDetectionStrategy, inject } from "@angular/core";
import type { MotionOptions } from "@primeuix/motion";
import { MenuItem } from "primeng/api";
import { BadgeModule } from "primeng/badge";
import { DividerModule } from "primeng/divider";
import { PanelMenuModule } from "primeng/panelmenu";
import { RippleModule } from "primeng/ripple";
import { DashboardSidebarService } from "@layouts/dashboard-layout/services";

interface SidebarMenuNodeConfig {
  readonly label: string;
  readonly icon?: string;
  readonly route?: string;
  readonly badge?: string;
  readonly expanded?: boolean;
  readonly children?: readonly SidebarMenuNodeConfig[];
}

interface SidebarMenuGroupConfig {
  readonly id: string;
  readonly label: string;
  readonly dividerBefore?: boolean;
  readonly expanded?: boolean;
  readonly items: readonly SidebarMenuNodeConfig[];
}

interface SidebarMenuGroup {
  readonly id: string;
  readonly dividerBefore: boolean;
  readonly items: MenuItem[];
}

/**
 * Component DashboardLayoutSidebar
 * @class DashboardLayoutSidebar
 *
 * @description
 * Sidebar component for dashboard layout, contains the navigation menu,
 * branding, and theme toggle. Used both as a static sidebar on desktop
 * and inside a Drawer overlay on mobile.
 *
 * Injects {@link DashboardSidebarService} to close the sidebar
 * on navigation without output chaining.
 *
 * @version 1.3.0
 *
 * @example
 * ```html
 * <app-dashboard-layout-sidebar/>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout-sidebar',
  imports: [
    BadgeModule,
    DividerModule,
    PanelMenuModule,
    RippleModule,
  ],
  templateUrl: './dashboard-layout-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutSidebar {
  //#region Properties
  /**
   * Property sidebarService
   * @readonly
   *
   * @description
   * Injects the DashboardSidebarService to control
   * sidebar state (e.g. close on navigation).
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {DashboardSidebarService}
   */
  protected readonly sidebarService: DashboardSidebarService =
    inject<DashboardSidebarService>(DashboardSidebarService);

  protected readonly panelMenuPt = {
    submenuIcon: { class: 'hidden' },
    submenu: {
      class: 'ml-6 border-l border-surface-200 pl-3',
    },
  };

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

  private readonly menuGroupConfigs: readonly SidebarMenuGroupConfig[] = [
    {
      id: 'home',
      label: 'Home',
      expanded: true,
      items: [
        { label: 'Dashboard', icon: 'pi pi-home', route: '/home' },
        { label: 'Bookmarks', icon: 'pi pi-bookmark', badge: '3' },
        { label: 'Team', icon: 'pi pi-users' },
        { label: 'Messages', icon: 'pi pi-inbox', badge: '1' },
        { label: 'Calendar', icon: 'pi pi-calendar' },
      ],
    },
    {
      id: 'organization',
      dividerBefore: true,
      label: 'Organization',
      expanded: true,
      items: [
        { label: 'Overview', icon: 'pi pi-sitemap' },
        {
          label: 'Security',
          icon: 'pi pi-shield',
          expanded: true,
          children: [
            { label: 'Domains', icon: 'pi pi-globe' },
            { label: 'Reports', icon: 'pi pi-file', badge: '4' },
          ],
        },
      ],
    },
  ];

  protected readonly menuGroups: readonly SidebarMenuGroup[] =
    this.menuGroupConfigs.map((group: SidebarMenuGroupConfig): SidebarMenuGroup => ({
      id: group.id,
      dividerBefore: group.dividerBefore ?? false,
      items: [
        {
          label: group.label,
          expanded: group.expanded ?? true,
          items: group.items.map((node: SidebarMenuNodeConfig) => this.createMenuItem(node)),
        },
      ],
    }));
  //#endregion

  private createMenuItem(node: SidebarMenuNodeConfig): MenuItem {
    const children: readonly SidebarMenuNodeConfig[] = node.children ?? [];
    const hasChildren: boolean = children.length > 0;

    return {
      label: node.label,
      icon: node.icon,
      badge: node.badge,
      routerLink: node.route,
      expanded: hasChildren ? node.expanded ?? true : undefined,
      items: hasChildren
        ? children.map((child: SidebarMenuNodeConfig) => this.createMenuItem(child))
        : undefined,
      command: hasChildren ? undefined : (): void => this.sidebarService.close(),
    };
  }
}
