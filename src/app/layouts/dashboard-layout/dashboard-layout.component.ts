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
  DashboardLayoutOrgRail,
  DashboardLayoutPanelHost,
} from '@layouts/dashboard-layout/components';
import {
  SHELL_INLINE_PANEL_MIN_WIDTH_PX,
  SHELL_RAIL_WIDTH_PX,
  SHELL_SECOND_PANEL_MIN_WIDTH_PX,
  SHELL_SIDEBAR_WIDTH_PX,
} from '@layouts/dashboard-layout/constants';
import {
  DashboardSidebarNavigationService,
  DashboardSidebarService,
  DashboardHeaderActionsService,
  DashboardPageHeaderService,
  DashboardPanelService,
} from './services';

/**
 * Component DashboardLayout
 * @class DashboardLayout
 *
 * @description
 * Application shell for dashboard pages, composed as four independently
 * scrolling regions: the organization rail, the channel sidebar, the main
 * column (header + the one page scroller), and a stack of contextual panels.
 *
 * Geometry is ported from the design system's collaboration kit; the widths
 * live in `constants/shell-geometry.constants.ts`.
 *
 * Responsive model:
 * - `>= 1536px` — everything inline, up to two panels
 * - `>= 1280px` — everything inline, one panel
 * - `>= 768px`  — rail and sidebar inline, panels as an overlay drawer
 * - `< 768px`   — rail and sidebar in the left drawer, panels in the right one
 *
 * `min-w-0` on the main column and `min-h-0` on the pane row are load-bearing:
 * without them a flex child refuses to shrink and the page scrolls sideways.
 *
 * @version 3.0.0
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
    DashboardLayoutOrgRail,
    DashboardLayoutPanelHost,
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
  /**
   * Property sidebarService
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {DashboardSidebarService}
   */
  protected readonly sidebarService: DashboardSidebarService =
    inject<DashboardSidebarService>(DashboardSidebarService);

  /**
   * Property panelService
   * @readonly
   *
   * @description
   * Provided by `provideDashboardLayoutSlots()` at the route's environment
   * injector, not by this component — a routed page injecting
   * `SHELL_PANEL_PORT` must resolve the same instance.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {DashboardPanelService}
   */
  protected readonly panelService: DashboardPanelService =
    inject<DashboardPanelService>(DashboardPanelService);

  /**
   * Property railWidth
   * @readonly
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {number}
   */
  protected readonly railWidth: number = SHELL_RAIL_WIDTH_PX;

  /**
   * Property sidebarWidth
   * @readonly
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {number}
   */
  protected readonly sidebarWidth: number = SHELL_SIDEBAR_WIDTH_PX;

  /**
   * Property isTablet
   * @readonly
   *
   * @description
   * Whether the rail and sidebar render inline rather than in a drawer.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isTablet: Signal<boolean> = this.matches('(min-width: 768px)');

  /**
   * Property canInlinePanel
   * @readonly
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canInlinePanel: Signal<boolean> = this.matches(
    `(min-width: ${SHELL_INLINE_PANEL_MIN_WIDTH_PX}px)`,
  );

  /**
   * Property canInlineSecondPanel
   * @readonly
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canInlineSecondPanel: Signal<boolean> = this.matches(
    `(min-width: ${SHELL_SECOND_PANEL_MIN_WIDTH_PX}px)`,
  );

  /**
   * Property maxInlinePanels
   * @readonly
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly maxInlinePanels: Signal<number> = computed((): number =>
    this.canInlineSecondPanel() ? 2 : 1,
  );

  /**
   * Property sidebarInlineWidth
   * @readonly
   *
   * @description
   * Collapsing hides the sidebar rather than shrinking it to an icon rail: with
   * a permanent organization rail, a second icon rail would rebuild the
   * two-column navigation that was deliberately removed.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly sidebarInlineWidth: Signal<number> = computed((): number =>
    this.sidebarService.primaryCollapsed() ? 0 : this.sidebarWidth,
  );

  /**
   * Property panelsInDrawer
   * @readonly
   *
   * @description
   * Whether open panels render as a right-hand overlay instead of inline.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly panelsInDrawer: Signal<boolean> = computed(
    (): boolean => !this.canInlinePanel() && this.panelService.openPanels().length > 0,
  );
  //#endregion

  //#region Methods
  /**
   * Method matches.
   *
   * @description
   * Wraps a media query as a signal. `initialValue: false` means the server and
   * the first client frame render the narrow branch; the dashboard is never
   * server-rendered (`app.routes.server.ts` maps `**` to `RenderMode.Client`),
   * so there is no hydration mismatch to guard against.
   *
   * @since 3.0.0
   *
   * @param {string} query the media query
   *
   * @returns {Signal<boolean>} whether the query currently matches
   */
  private matches(query: string): Signal<boolean> {
    return toSignal(
      inject<BreakpointObserver>(BreakpointObserver)
        .observe(query)
        .pipe(map((result): boolean => result.matches)),
      { initialValue: false },
    );
  }
  //#endregion
}
