import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, ChangeDetectionStrategy, computed, inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { map } from 'rxjs';
import { BreadcrumbService } from '@core/breadcrumb';
import {
  DashboardLayoutHeader,
  DashboardLayoutSidebar,
  DashboardLayoutContent,
} from '@layouts/dashboard-layout/components';
import {
  DashboardSidebarNavigationService,
  DashboardSidebarService,
  DashboardHeaderActionsService,
  DashboardPageHeaderService,
} from './services';

/**
 * Component DashboardLayout
 * @class DashboardLayout
 *
 * @description
 * Application shell for dashboard pages: a single tinted sidebar (brand,
 * shell widgets, navigation) next to a header + content column. The header
 * and the content share the same centered max-width column.
 *
 * Provides {@link DashboardSidebarService} and
 * {@link DashboardSidebarNavigationService} at the component level
 * so child components can inject them directly.
 *
 * Responsive behavior:
 * - Desktop (xl+): full sidebar, collapsible to an icon-only rail
 * - Tablet (lg-xl): icon-only rail
 * - Mobile (<lg): sidebar hidden, accessible via Drawer overlay
 *
 * @version 2.0.0
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
  ],
  providers: [
    DashboardSidebarService,
    DashboardSidebarNavigationService,
    DashboardHeaderActionsService,
    DashboardPageHeaderService,
    BreadcrumbService,
  ],
  templateUrl: './dashboard-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayout {
  //#region Properties
  protected readonly sidebarService: DashboardSidebarService =
    inject<DashboardSidebarService>(DashboardSidebarService);

  protected readonly isDesktopSidebar: Signal<boolean> = toSignal(
    inject<BreakpointObserver>(BreakpointObserver)
      .observe('(min-width: 1280px)')
      .pipe(map((result) => result.matches)),
    { initialValue: false },
  );

  /**
   * Property primaryIconOnly
   * @readonly
   *
   * @description
   * Whether the sidebar should render in its icon-only (rail) form. True
   * either when below the desktop breakpoint (tablet) or when the user has
   * explicitly collapsed the sidebar via the brand toggle.
   *
   * @access protected
   * @since 4.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly primaryIconOnly: Signal<boolean> = computed(
    (): boolean => !this.isDesktopSidebar() || this.sidebarService.primaryCollapsed(),
  );
  //#endregion
}
