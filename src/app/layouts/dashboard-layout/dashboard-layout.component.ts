import { Dialog } from '@angular/cdk/dialog';
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import {
  afterRenderEffect,
  type AfterRenderRef,
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  type ElementRef,
  inject,
  type Signal,
  signal,
  type WritableSignal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideEllipsis, lucideMenu, lucidePanelLeft } from '@ng-icons/lucide';
import { filter } from 'rxjs';
import { BreadcrumbService } from '@core/breadcrumb';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { DASHBOARD_MOBILE_NAVIGATION_ROOT_DATA_KEY } from '@core/routing';
import { TitleService } from '@core/title';
import { resolveExclusiveSlot, type SlotContribution, SlotOutlet } from '@shared/layout-slot';
import { HlmButton } from '@shared/ui/button';
import { HlmDrawer, HlmDrawerImports } from '@shared/ui/drawer';
import { HlmItemGroup } from '@shared/ui/item';
import { HlmResizableImports } from '@shared/ui/resizable';
import { HlmSeparator } from '@shared/ui/separator';
import {
  HlmSidebar,
  HlmSidebarContent,
  HlmSidebarFooter,
  HlmSidebarHeader,
  HlmSidebarInset,
  HlmSidebarWrapper,
  HlmSidebarService,
} from '@shared/ui/sidebar';
import { hlm } from '@shared/ui/utils';
import { DashboardPageHeader } from './components';
import type { DashboardPanelContribution, SidebarExtensionContribution } from './models';
import {
  DASHBOARD_HEADER_ACTIONS_SLOT,
  DASHBOARD_MOBILE_ACTIONS_SLOT,
  DASHBOARD_MOBILE_NAVIGATION_SLOT,
  DASHBOARD_HEADER_SLOT,
  DASHBOARD_PANEL_SLOT,
  DASHBOARD_SIDEBAR_EXTENSION_SLOT,
  DASHBOARD_SIDEBAR_FOOTER_SLOT,
  DASHBOARD_SIDEBAR_HEADER_SLOT,
  DASHBOARD_SIDEBAR_NAV_SLOT,
} from './slots';

/**
 * Component DashboardLayout
 * @class DashboardLayout
 *
 * @description
 * Composes the routed shell from feature-owned slots while keeping business workflows outside
 * the layout. Desktop uses Spartan's sidebar, a bounded resizable extension and direct tools;
 * mobile interaction mode uses a title toolbar, bottom navigation and a native quick-actions
 * drawer without recreating content.
 * Backdrop dismissal targets only the topmost native dialog so a child drawer cannot dispose
 * its owner. Explicit, Escape and swipe dismissal remain native; successful navigation closes
 * the chooser.
 * The main inset owns the page scrollbar while its toolbar and page header remain sticky, so the
 * scrollbar spans the page chrome without introducing a second content-only scroll container.
 * Quick actions focus their heading and declare public CDK region boundaries so
 * button-only content retains native focus containment under the iOS tabbability heuristic.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-dashboard-layout />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout',
  imports: [
    NgComponentOutlet,
    NgTemplateOutlet,
    NgIcon,
    RouterOutlet,
    RouterLink,
    SlotOutlet,
    DashboardPageHeader,
    HlmButton,
    HlmDrawerImports,
    HlmItemGroup,
    HlmResizableImports,
    HlmSeparator,
    HlmSidebar,
    HlmSidebarContent,
    HlmSidebarFooter,
    HlmSidebarHeader,
    HlmSidebarInset,
    HlmSidebarWrapper,
  ],
  providers: [
    BreadcrumbService,
    provideIcons({ lucideArrowLeft, lucideEllipsis, lucideMenu, lucidePanelLeft }),
  ],
  templateUrl: './dashboard-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayout {
  /**
   * Property mobileActions
   * @readonly
   * @description Feature tools rendered only in the mobile quick-actions drawer.
   * @access protected
   * @since 1.0.0
   * @type {readonly SlotContribution[]}
   */
  protected readonly mobileActions: readonly SlotContribution[] =
    inject(DASHBOARD_MOBILE_ACTIONS_SLOT, { optional: true }) ?? [];

  //#region Properties
  /**
   * Property document
   * @readonly
   * @description Browser viewport access without touching browser globals during SSR.
   * @access private
   * @since 1.0.0
   * @type {Document}
   */
  private readonly document: Document = inject(DOCUMENT);

  /**
   * Property viewportHeight
   * @readonly
   * @description Available visual height, including on-screen keyboard occlusion; CSS handles the initial render.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<string>}
   */
  protected readonly viewportHeight: WritableSignal<string> = signal('100dvh');

  /**
   * Property observeViewportHeight
   * @readonly
   * @description Tracks visual height for browser chrome and the on-screen keyboard. Pinch zoom
   * keeps the previous layout height rather than shrinking the application canvas.
   * @access private
   * @since 1.0.0
   * @type {AfterRenderRef}
   */
  private readonly observeViewportHeight: AfterRenderRef = afterRenderEffect((onCleanup) => {
    const browser: Window | null = this.document.defaultView;
    if (!browser) return;
    const viewport: VisualViewport | null = browser.visualViewport;
    const updateHeight = (): void => {
      if (viewport && viewport.scale !== 1) return;
      const height: number = viewport?.height ?? browser.innerHeight;
      if (height > 0) this.viewportHeight.set(`${height}px`);
    };
    viewport?.addEventListener('resize', updateHeight);
    browser.addEventListener('resize', updateHeight);
    updateHeight();
    onCleanup(() => {
      viewport?.removeEventListener('resize', updateHeight);
      browser.removeEventListener('resize', updateHeight);
    });
  });

  /**
   * Property mobileNavigation
   * @readonly
   * @description Feature-owned bottom navigation contributions.
   * @access protected
   * @since 1.0.0
   * @type {readonly SlotContribution[]}
   */
  protected readonly mobileNavigation: readonly SlotContribution[] =
    inject<SlotContribution[]>(DASHBOARD_MOBILE_NAVIGATION_SLOT, { optional: true }) ?? [];

  /**
   * Property navigationRegion
   * @readonly
   * @description Normal-flow navigation band, including its safe-area padding.
   * @access private
   * @since 1.0.0
   * @type {Signal<ElementRef<HTMLElement> | undefined>}
   */
  private readonly navigationRegion: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('navigationRegion');

  /**
   * Property navigationHeight
   * @readonly
   * @description Measured navigation height; its initial minimum also reserves space before hydration.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<string>}
   */
  protected readonly navigationHeight: WritableSignal<string> = signal(
    'calc(4rem + env(safe-area-inset-bottom))',
  );

  /**
   * Property observeNavigationHeight
   * @readonly
   * @description Publishes the navigation border-box height, including wrapped labels and safe areas.
   * The browser-only observer and resize fallback are released when the band leaves the view.
   * @access private
   * @since 1.0.0
   * @type {AfterRenderRef}
   */
  private readonly observeNavigationHeight: AfterRenderRef = afterRenderEffect((onCleanup) => {
    const region: HTMLElement | undefined = this.navigationRegion()?.nativeElement;
    if (!region) return;
    const browser: Window | null = this.document.defaultView;
    const updateHeight = (): void => {
      const height: number = region.getBoundingClientRect().height;
      if (height > 0) this.navigationHeight.set(`${height}px`);
    };
    const observer: ResizeObserver | null =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateHeight);
    observer?.observe(region, { box: 'border-box' });
    browser?.addEventListener('resize', updateHeight);
    updateHeight();
    onCleanup(() => {
      observer?.disconnect();
      browser?.removeEventListener('resize', updateHeight);
    });
  });

  /**
   * Property title
   * @readonly
   * @description Live route title displayed in the mobile toolbar.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly title: Signal<string> = inject(TitleService).pageTitle;

  /**
   * Property breadcrumbs
   * @readonly
   * @description Route-owned destinations used for contextual back navigation.
   * @access private
   * @since 1.0.0
   * @type {BreadcrumbService}
   */
  private readonly breadcrumbs: BreadcrumbService = inject(BreadcrumbService);

  /**
   * Property router
   * @readonly
   * @description Current destination used to exclude self links from back navigation.
   * @access private
   * @since 1.0.0
   * @type {Router}
   */
  private readonly router: Router = inject(Router);

  /**
   * Property activatedRoute
   * @readonly
   * @description Active route tree used to distinguish primary destinations from detail screens.
   * @access private
   * @since 1.0.0
   * @type {ActivatedRoute}
   */
  private readonly activatedRoute: ActivatedRoute = inject(ActivatedRoute);

  /**
   * Property isMobileNavigationRoot
   * @readonly
   * @description Whether the deepest route is represented directly in bottom navigation.
   * @access private
   * @since 1.0.0
   * @type {WritableSignal<boolean>}
   */
  private readonly isMobileNavigationRoot: WritableSignal<boolean> = signal(false);

  /**
   * Property mobileActionsDrawer
   * @readonly
   * @description The shell chooser; closing it also disposes its feature-owned child overlays.
   * @access private
   * @since 1.0.0
   * @type {Signal<HlmDrawer | undefined>}
   */
  private readonly mobileActionsDrawer: Signal<HlmDrawer | undefined> =
    viewChild<HlmDrawer>('mobileActionsDrawer');

  /**
   * Property dialogs
   * @readonly
   * @description Public CDK registry underlying Spartan, used only for topmost backdrop dismissal.
   * @access private
   * @since 1.0.0
   * @type {Dialog}
   */
  private readonly dialogs: Dialog = inject(Dialog);

  /**
   * Property observeActionsBackdrop
   * @readonly
   * @description The installed Brain outside handler does not distinguish nested global dialogs.
   * Listen to this drawer's own backdrop instead, after its native ref exists, and release the
   * listener on close or teardown. Child overlays keep their own native dismissal and focus.
   * @access private
   * @since 1.0.0
   * @type {AfterRenderRef}
   */
  private readonly observeActionsBackdrop: AfterRenderRef = afterRenderEffect((onCleanup) => {
    const drawer = this.mobileActionsDrawer();
    if (drawer?.stateComputed() !== 'open') return;
    const ref = this.dialogs.getDialogById<unknown, unknown>(drawer.id());
    if (!ref) return;
    const subscription = ref.backdropClick.subscribe((): void => {
      if (this.dialogs.openDialogs.at(-1) === ref) drawer.close();
    });
    onCleanup((): void => subscription.unsubscribe());
  });

  /**
   * Property backLink
   * @readonly
   * @description Nearest labelled ancestor, without relying on browser history or leaving the workspace.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string | null>}
   */
  protected readonly backLink: Signal<string | null> = computed(() => {
    if (this.isMobileNavigationRoot()) return null;

    return (
      this.breadcrumbs
        .items()
        .findLast(
          (item) =>
            !item.current &&
            item.routerLink &&
            item.routerLink !== this.router.url.split(/[?#]/)[0],
        )?.routerLink ?? null
    );
  });
  /**
   * Property sidebarExtensionContributions
   * @readonly
   *
   * @description
   * Feature-owned candidates for the contextual navigation column.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {readonly SidebarExtensionContribution[]}
   */
  private readonly sidebarExtensionContributions: readonly SidebarExtensionContribution[] =
    inject<SidebarExtensionContribution[]>(DASHBOARD_SIDEBAR_EXTENSION_SLOT, { optional: true }) ??
    [];

  /**
   * Property sidebarExtension
   * @readonly
   *
   * @description
   * Active extension, resolved without any feature-specific shell logic.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<SidebarExtensionContribution | null>}
   */
  protected readonly sidebarExtension: Signal<SidebarExtensionContribution | null> = computed(() =>
    resolveExclusiveSlot(this.sidebarExtensionContributions),
  );

  /**
   * Property contentClass
   * @readonly
   *
   * @description
   * The shared routed-content container and its standard vertical page spacing.
   * Sidebar workspaces such as messaging can request a flush, full-height canvas.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<string>}
   */
  protected readonly contentClass: Signal<string> = computed((): string =>
    hlm(
      'container mx-auto flex min-h-0 flex-1 flex-col max-sm:px-4',
      this.sidebarExtension()?.contentPadding === false ? null : 'py-4 md:py-6',
    ),
  );

  /**
   * Property sidebarHeader
   * @readonly
   *
   * @description
   * Contributions at the top of the sidebar.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly SlotContribution[]}
   */
  protected readonly sidebarHeader: readonly SlotContribution[] =
    inject<SlotContribution[]>(DASHBOARD_SIDEBAR_HEADER_SLOT, { optional: true }) ?? [];

  /**
   * Property sidebarNav
   * @readonly
   *
   * @description
   * Contributions filling the scrolling body of the sidebar.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly SlotContribution[]}
   */
  protected readonly sidebarNav: readonly SlotContribution[] =
    inject<SlotContribution[]>(DASHBOARD_SIDEBAR_NAV_SLOT, { optional: true }) ?? [];

  /**
   * Property sidebarFooter
   * @readonly
   *
   * @description
   * Contributions pinned to the bottom of the sidebar.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly SlotContribution[]}
   */
  protected readonly sidebarFooter: readonly SlotContribution[] =
    inject<SlotContribution[]>(DASHBOARD_SIDEBAR_FOOTER_SLOT, { optional: true }) ?? [];

  /**
   * Property header
   * @readonly
   *
   * @description
   * Contributions filling the header from the sidebar trigger rightwards.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly SlotContribution[]}
   */
  protected readonly header: readonly SlotContribution[] =
    inject<SlotContribution[]>(DASHBOARD_HEADER_SLOT, { optional: true }) ?? [];

  /**
   * Property headerActions
   * @readonly
   *
   * @description
   * Contributions of the tool cluster at the right of the header.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly SlotContribution[]}
   */
  protected readonly headerActions: readonly SlotContribution[] =
    inject<SlotContribution[]>(DASHBOARD_HEADER_ACTIONS_SLOT, { optional: true }) ?? [];

  /**
   * Property sidebarService
   * @readonly
   *
   * @description
   * Native sidebar geometry and collapse behavior in desktop interaction mode.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {HlmSidebarService}
   */
  private readonly sidebarService: HlmSidebarService = inject<HlmSidebarService>(HlmSidebarService);

  /**
   * Property isMobileInteractionMode
   * @readonly
   * @description Interaction-mode choice for phones and tablets, independent of viewport geometry.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly isMobileInteractionMode: Signal<boolean> = inject(
    INTERACTION_CAPABILITIES_PORT,
  ).isMobileInteractionMode;

  /**
   * Property compactSidebar
   * @readonly
   * @description Whether the desktop sidebar uses its native compact hamburger presentation.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly compactSidebar: Signal<boolean> = this.sidebarService.isMobile;

  /**
   * Property panelContributions
   * @readonly
   *
   * @description
   * Every contribution competing for the contextual column.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {readonly DashboardPanelContribution[]}
   */
  private readonly panelContributions: readonly DashboardPanelContribution[] =
    inject<DashboardPanelContribution[]>(DASHBOARD_PANEL_SLOT, { optional: true }) ?? [];

  /**
   * Property panel
   * @readonly
   *
   * @description
   * The contribution currently claiming the contextual column, or `null`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<DashboardPanelContribution | null>}
   */
  protected readonly panel: Signal<DashboardPanelContribution | null> = computed(
    (): DashboardPanelContribution | null => resolveExclusiveSlot(this.panelContributions),
  );

  /**
   * Property panelLabel
   * @readonly
   * @description Accessible name of the active right-hand complementary region.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly panelLabel: Signal<string> = computed(() => {
    const label = this.panel()?.label;
    return typeof label === 'function' ? label() : (label ?? '');
  });

  /**
   * Property content
   * @readonly
   *
   * @description
   * The routed content column, focused by the skip link. It is the target
   * rather than the `<main>` landmark itself so that activating the link
   * lands past the header's title and tool cluster, on the page the user
   * asked to reach.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<ElementRef<HTMLElement> | undefined>}
   */
  private readonly content: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('content');

  /**
   * Property extensionContent
   * @readonly
   *
   * @description
   * Alternate skip-link target when the extension replaces main content on mobile.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<ElementRef<HTMLElement> | undefined>}
   */
  private readonly extensionContent: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('extensionContent');

  /**
   * Property toggleSidebarLabel
   * @readonly
   *
   * @description
   * Accessible name of the sidebar trigger. Bound rather than written in the
   * template because it feeds a component input, which `i18n-` does not reach.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly toggleSidebarLabel: string = $localize`:@@dashboard.toggleSidebar:Toggle sidebar`;
  //#endregion

  //#region Methods
  /**
   * Constructor
   * @constructor
   * @description Dismisses the mobile chooser after successful navigation without affecting cancelled guards or feature state.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((): void => {
        this.updateMobileNavigationRoot();
        this.mobileActionsDrawer()?.close();
      });
  }

  /**
   * Method updateMobileNavigationRoot
   * @method updateMobileNavigationRoot
   * @description Reads only the deepest route's own metadata so detail children do not inherit a root marker.
   * @access private
   * @since 1.0.0
   * @returns {void}
   */
  private updateMobileNavigationRoot(): void {
    let route: ActivatedRoute = this.activatedRoute;
    while (route.firstChild) route = route.firstChild;

    this.isMobileNavigationRoot.set(
      route.snapshot?.routeConfig?.data?.[DASHBOARD_MOBILE_NAVIGATION_ROOT_DATA_KEY] === true,
    );
  }

  /**
   * Method skipToContent
   * @method skipToContent
   *
   * @description
   * Moves focus to the visible content, including a mobile extension replacing main.
   *
   * The anchor's own default is suppressed: the document declares
   * `<base href="/">`, so following a bare fragment resolves against the base
   * and hard-navigates to the app root instead of jumping within the page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The link activation.
   *
   * @returns {void}
   */
  protected skipToContent(event: Event): void {
    event.preventDefault();
    const mainContent = this.content()?.nativeElement;
    const target = mainContent?.getClientRects().length
      ? mainContent
      : (this.extensionContent()?.nativeElement ?? mainContent);
    target?.focus();
  }

  /**
   * Method toggleSidebar
   * @method toggleSidebar
   * @description Toggles the native desktop sidebar.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected toggleSidebar(): void {
    this.sidebarService.toggleSidebar();
  }
  //#endregion
}
