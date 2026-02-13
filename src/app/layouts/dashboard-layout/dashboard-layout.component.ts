import { Component, ChangeDetectionStrategy, inject } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { DashboardLayoutHeader, DashboardLayoutSidebar, DashboardLayoutContent } from "@layouts/dashboard-layout/partials";
import { DrawerModule } from 'primeng/drawer';
import { Ripple } from "primeng/ripple";
import { DashboardSidebarResizeHandleDirective } from './directives';
import { DashboardSidebarService } from './services';

/**
 * Component DashboardLayout
 * @class DashboardLayout
 *
 * @description
 * Layout component for dashboard pages like
 * home, profile, settings, etc.
 *
 * Provides {@link DashboardSidebarService} at the component level
 * so child components can inject it directly.
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
  providers: [DashboardSidebarService],
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
    inject(DashboardSidebarService);

  /**
   * Property minSidebarWidth
   * @readonly
   *
   * @description
   * Minimum sidebar width in pixels, used to enforce
   * constraints during resizing.
   *
   * @access protected
   * @since 1.5.0
   *
   * @type {number}
   */
  protected readonly minSidebarWidth: number = DashboardSidebarService.MIN_WIDTH;

  /**
   * Property maxSidebarWidth
   * @readonly
   *
   * @description
   * Maximum sidebar width in pixels, used to enforce
   * constraints during resizing.
   *
   * @access protected
   * @since 1.5.0
   *
   * @type {number}
   */
  protected readonly maxSidebarWidth: number = DashboardSidebarService.MAX_WIDTH;
  //#endregion
}
