import { BreakpointObserver } from '@angular/cdk/layout';
import {
  Component,
  ChangeDetectionStrategy,
  computed,
  effect,
  inject,
  type Signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { Ripple } from 'primeng/ripple';
import { map } from 'rxjs';
import { BreadcrumbService } from '@core/services/breadcrumb';
import {
  DashboardLayoutHeader,
  DashboardLayoutSidebar,
  DashboardLayoutContent,
  DashboardLayoutContextPanel,
} from '@layouts/dashboard-layout/components';
import { ASIDE_SLOT, type AsideContribution } from '@layouts/dashboard-layout/slots/aside';
import { DashboardSidebarResizeHandleDirective } from './directives';
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
    DashboardLayoutContextPanel,
    DashboardLayoutContent,
    DrawerModule,
    Ripple,
    DashboardSidebarResizeHandleDirective,
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

  private readonly contributions: AsideContribution[] =
    inject<AsideContribution[]>(ASIDE_SLOT, { optional: true }) ?? [];

  protected readonly hasActiveContextPanel: Signal<boolean> = computed((): boolean =>
    this.contributions.some((c: AsideContribution) => c.active()),
  );

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
   * Whether the primary sidebar should render in its icon-only (reduced)
   * form. True either when below the desktop breakpoint (tablet) or when
   * the user has explicitly collapsed the sidebar via the header toggle.
   *
   * @access protected
   * @since 4.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly primaryIconOnly: Signal<boolean> = computed(
    (): boolean => !this.isDesktopSidebar() || this.sidebarService.primaryCollapsed(),
  );

  /**
   * Tracks the previous context-panel active state so the effect reacts
   * only to open/close transitions, not to every change detection pass.
   */
  private contextPanelWasActive: boolean = false;

  /**
   * Primary sidebar collapsed state captured right before the context
   * panel auto-collapsed it, restored when the context panel closes.
   */
  private primaryCollapsedBeforeContext: boolean = false;

  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the primary sidebar to the context panel: opening the context
   * navigation bar auto-collapses the primary sidebar to its icon-only
   * form (the header toggle still lets the user re-open it), and closing
   * the context panel restores the sidebar to its pre-context state.
   *
   * @access public
   * @since 1.6.0
   */
  public constructor() {
    effect((): void => {
      const active: boolean = this.hasActiveContextPanel();
      if (active === this.contextPanelWasActive) return;
      this.contextPanelWasActive = active;

      if (active) {
        this.primaryCollapsedBeforeContext = untracked((): boolean =>
          this.sidebarService.primaryCollapsed(),
        );
        this.sidebarService.setPrimaryCollapsed(true);
      } else {
        this.sidebarService.setPrimaryCollapsed(this.primaryCollapsedBeforeContext);
      }
    });
  }
  //#endregion
}
