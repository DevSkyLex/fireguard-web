import { Component, ChangeDetectionStrategy, inject } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { RippleModule } from "primeng/ripple";
import { DashboardSidebarService } from "@layouts/dashboard-layout/services";

/**
 * Interface SidebarMenuItem
 * @interface SidebarMenuItem
 *
 * @description
 * Represents a navigation item in the dashboard sidebar menu.
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
interface SidebarMenuItem {
  readonly label: string;
  readonly icon: string;
  readonly route: string;
  readonly exact: boolean;
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
  imports: [RouterLink, RouterLinkActive, RippleModule],
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
  //#endregion

  protected readonly menuItems: readonly SidebarMenuItem[] = [
    { label: 'Home', icon: 'pi pi-home', route: '/home', exact: true },
  ];
}
