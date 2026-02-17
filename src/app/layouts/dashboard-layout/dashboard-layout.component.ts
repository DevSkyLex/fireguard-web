import { Component, ChangeDetectionStrategy, inject } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { DashboardLayoutHeader, DashboardLayoutSidebar, DashboardLayoutContent } from "@layouts/dashboard-layout/partials";
import { DrawerModule } from 'primeng/drawer';
import { Ripple } from "primeng/ripple";
import { DashboardSidebarResizeHandleDirective } from './directives';
import { DashboardBreadcrumbService, DashboardSidebarNavigationService, DashboardSidebarService } from './services';

/**
 * Component DashboardLayout
 * @class DashboardLayout
 *
 * @description
 * Layout component for dashboard pages like
 * home, profile, settings, etc.
 *
 * Provides {@link DashboardSidebarService} and
 * {@link DashboardSidebarNavigationService} at the component level
 * so child components can inject them directly.
 *
 * Responsive behavior:
 * - Desktop (lg+): resizable sidebar panel on the left (drag handle)
 * - Mobile (<lg): sidebar hidden, accessible via Drawer overlay
 *
 * @version 1.5.0
 *
 * @example
 * ```html
 * <app-dashboard-layout/>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout',
  imports: [
    RouterOutlet,
    DashboardLayoutHeader,
    DashboardLayoutSidebar,
    DashboardLayoutContent,
    DrawerModule,
    Ripple,
    DashboardSidebarResizeHandleDirective,
  ],
  providers: [DashboardSidebarService, DashboardSidebarNavigationService, DashboardBreadcrumbService],
  templateUrl: './dashboard-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayout {
  //#region Properties
  /**
   * Property sidebarService
   * @readonly
   *
   * @description
   * Injects the DashboardSidebarService to control
   * sidebar state (e.g. width, visibility)
   *
   * @access protected
   * @since 1.5.0
   *
   * @type {DashboardSidebarService}
   */
  protected readonly sidebarService: DashboardSidebarService =
    inject<DashboardSidebarService>(DashboardSidebarService);
  //#endregion
}
