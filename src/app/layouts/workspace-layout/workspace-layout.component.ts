import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  inject,
  type Signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  type ActivatedRouteSnapshot,
  type Event as RouterEvent,
  NavigationEnd,
  NavigationSkipped,
  NavigationSkippedCode,
  Router,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';
import { BreadcrumbService } from '@core/breadcrumb';
import {
  WorkspaceLayoutHeader,
  WorkspaceLayoutPanelOutlet,
  WorkspaceLayoutRail,
  WorkspaceLayoutSecondaryNav,
} from './components';
import { WorkspaceShellService } from './services';

/**
 * Component WorkspaceLayout
 * @class WorkspaceLayout
 *
 * @description
 * Collaboration shell: a four-column, full-bleed frame made of the
 * organization rail, the channel sidebar, the routed main column, and a
 * mono-active contextual panel.
 *
 * This is the shell for every authenticated route. It never scrolls itself —
 * it is `overflow-hidden` and every column owns its own scroll container, so a
 * message thread can scroll while its composer stays pinned.
 *
 * Provides {@link WorkspaceShellService} and {@link BreadcrumbService} at the
 * component level, so hosted routes get the trail the header renders.
 *
 * Responsive behavior:
 * - Desktop (≥1024px): rail, sidebar, main column and panel side by side
 * - Mobile (<1024px): rail hidden, a single pane showing either the sidebar
 *   (`list`) or the main column (`main`), with the panel as a full overlay
 *
 * The breakpoint lives in CSS (`lg:`, which is 1024px because `rem` in media
 * queries resolves against the initial 16px root, not `html { font-size: 14px }`)
 * so the correct columns render before hydration; the signal only drives which
 * mobile pane is visible.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-workspace-layout />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-workspace-layout',
  imports: [
    RouterOutlet,
    WorkspaceLayoutHeader,
    WorkspaceLayoutRail,
    WorkspaceLayoutSecondaryNav,
    WorkspaceLayoutPanelOutlet,
  ],
  providers: [WorkspaceShellService, BreadcrumbService],
  templateUrl: './workspace-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceLayout {
  //#region Properties
  /**
   * Property shell
   * @readonly
   *
   * @description
   * Shell state shared with every column: desktop breakpoint, mobile pane,
   * panel visibility and sidebar collapse.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WorkspaceShellService}
   */
  protected readonly shell: WorkspaceShellService =
    inject<WorkspaceShellService>(WorkspaceShellService);

  /**
   * Property route
   * @readonly
   *
   * @description
   * This layout's own route, read only for whether a child is currently routed
   * into the main column.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property organizationId
   *
   * @description
   * The organization the last sync saw, so an organization switch can be told
   * apart from an ordinary in-shell navigation.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {string | null}
   */
  private organizationId: string | null = null;

  /**
   * Property arriving
   *
   * @description
   * Whether the shell is still handling the navigation that created it.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {boolean}
   */
  private arriving = true;

  /**
   * Property main
   * @readonly
   *
   * @description
   * The main column, focused by the skip link.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {Signal<ElementRef<HTMLElement> | undefined>}
   */
  private readonly main: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('main');
  //#endregion

  //#region Lifecycle
  /**
   * Method constructor
   *
   * @description
   * Keeps the mobile pane in step with routing.
   *
   * Below 1024px the sidebar and the main column are stacked panes and only one
   * is displayed. Nothing switched between them: `showMain()` existed, was
   * unit-tested, and was called by no template — so a member on a phone tapped
   * a channel, the URL changed, and the screen did not. The routed column was
   * `display:none`, which also took it out of the tab order.
   *
   * Driving this from `NavigationEnd` rather than from each nav row is what
   * makes it hold: the channel rows, the org tiles, the panel's linked threads
   * and the command palette all move the routed column, and `(activate)` on the
   * outlet would miss channel-to-channel navigation entirely — Angular reuses
   * the component and never re-fires it.
   *
   * @access public
   * @since 1.1.0
   */
  public constructor() {
    this.organizationId = this.readOrganizationId();
    this.syncMobilePane(true);

    inject<Router>(Router)
      .events.pipe(
        // `NavigationSkipped` matters as much as `NavigationEnd`: the mobile
        // back button changes the pane without changing the URL, so re-opening
        // the destination the member just left is a same-URL navigation the
        // router ignores. Without this, that member is stranded on the list.
        filter(
          (event: RouterEvent): boolean =>
            event instanceof NavigationEnd ||
            (event instanceof NavigationSkipped &&
              event.code === NavigationSkippedCode.IgnoredSameUrlNavigation),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((): void => {
        // The first event is the completion of the very navigation that created
        // this layout — the constructor has already handled it, and treating it
        // as an in-shell click would open the main column on a deep link to the
        // bare workspace URL.
        const arriving: boolean = this.arriving;
        this.arriving = false;

        this.syncMobilePane(arriving);
      });
  }
  //#endregion

  //#region Methods
  /**
   * Method skipToContent
   * @method skipToContent
   *
   * @description
   * Moves focus to the main column, bypassing the rail and the whole channel
   * sidebar.
   *
   * The anchor's own default is suppressed: `<base href="/">` makes a bare
   * fragment resolve against the app root, so following it navigated out of the
   * workspace instead of jumping within it.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {Event} event - The link activation.
   *
   * @return {void}
   */
  protected skipToContent(event: Event): void {
    event.preventDefault();
    this.main()?.nativeElement.focus();
  }
  //#endregion

  //#region Internals
  /**
   * Method syncMobilePane
   * @method syncMobilePane
   *
   * @description
   * Decides which of the two stacked mobile panes is shown.
   *
   * Arriving — a deep link, or switching organization from the rail — the pane
   * follows the URL: a destination below the organization opens the main
   * column, the bare organization URL leaves the member on the list they need
   * to choose from.
   *
   * Navigating *inside* the shell always opens the main column, even when the
   * destination contributes no URL segment. The organization overview is
   * mounted at `path: ''` and is a first-class sidebar row, so the URL-shape
   * rule alone made Dashboard unreachable on a phone: the page rendered into a
   * column that stayed `display:none`.
   *
   * @access private
   * @since 1.1.0
   *
   * @param {boolean} arriving - Whether this is the first sync for this organization.
   *
   * @return {void}
   */
  private syncMobilePane(arriving: boolean): void {
    const organizationId: string | null = this.readOrganizationId();
    const switchedOrganization: boolean = organizationId !== this.organizationId;
    this.organizationId = organizationId;

    if (!arriving && !switchedOrganization) {
      this.shell.showMain();

      return;
    }

    if (this.hasRoutedDestination()) {
      this.shell.showMain();

      return;
    }

    this.shell.showList();
  }

  /**
   * Method hasRoutedDestination
   * @method hasRoutedDestination
   *
   * @description
   * Whether the URL points at something the member chose, rather than at the
   * organization landing the sidebar itself is the entry point for.
   *
   * Only the segments *below* `:organizationId` count: the shell is mounted at
   * the app root, so `organizations/:id` is part of every in-shell URL and
   * would otherwise read as a destination on its own. Outside an organization
   * scope (`/account`) any segment counts.
   *
   * @access private
   * @since 1.2.0
   *
   * @return {boolean} `true` when a routed destination is open.
   */
  private hasRoutedDestination(): boolean {
    // The snapshot tree, not the `ActivatedRoute` tree: this also runs from the
    // constructor, and a child `ActivatedRoute` being activated has no
    // `snapshot` yet — reading it there throws before the shell ever renders.
    let child: ActivatedRouteSnapshot | null = this.route.snapshot.firstChild;
    let scoped = false;
    let routed = false;

    while (child !== null) {
      if (!scoped && child.paramMap.get('organizationId') !== null) {
        // Everything above the organization is shell plumbing, not a
        // destination.
        scoped = true;
        routed = false;
      } else if (child.url.length > 0) {
        routed = true;
      }

      child = child.firstChild;
    }

    return routed;
  }

  /**
   * Method readOrganizationId
   * @method readOrganizationId
   *
   * @description
   * The organization the shell is currently scoped to, read from the routed
   * chain because the parameter is declared on a descendant of this layout.
   *
   * @access private
   * @since 1.1.0
   *
   * @return {string | null} The bare organization id, or `null` outside a scoped route.
   */
  private readOrganizationId(): string | null {
    let child: ActivatedRouteSnapshot | null = this.route.snapshot.firstChild;

    while (child !== null) {
      const id: string | null = child.paramMap.get('organizationId');

      if (id !== null) return id;

      child = child.firstChild;
    }

    return null;
  }
  //#endregion
}
