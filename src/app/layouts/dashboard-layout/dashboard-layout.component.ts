import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  inject,
  type Signal,
  viewChild,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BreadcrumbService } from '@core/breadcrumb';
import {
  type ExclusiveSlotContribution,
  resolveExclusiveSlot,
  type SlotContribution,
  SlotOutlet,
} from '@shared/layout-slot';
import { HlmSeparator } from '@shared/ui/separator';
import {
  HlmSidebar,
  HlmSidebarContent,
  HlmSidebarFooter,
  HlmSidebarHeader,
  HlmSidebarInset,
  HlmSidebarTrigger,
  HlmSidebarWrapper,
} from '@shared/ui/sidebar';
import { hlm } from '@shared/ui/utils';
import { DashboardPageHeader } from './components';
import type { SidebarExtensionContribution } from './models';
import {
  DASHBOARD_HEADER_ACTIONS_SLOT,
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
 * The application shell, built on spartan's standard sidebar variant. The main
 * column fills its available area without outer gutters, rounded corners or
 * shadow, carrying the sidebar trigger, page tools and routed outlet. The
 * contextual panel is flush on desktop and remains an overlay on mobile.
 *
 * Everything it renders comes from slots, so the shell knows no feature. The
 * sidebar itself is spartan's — collapse state, its cookie, the Ctrl/Cmd+B
 * shortcut and the mobile sheet all come from `HlmSidebarService`, and are not
 * reimplemented here.
 *
 * The shell never scrolls: it is `overflow-hidden` and each column owns its own
 * scroller, so a pinned toolbar stays put while its content moves.
 * An exclusive sidebar extension can add a column between navigation and content.
 * Below 1024px its owner chooses whether that column or routed content is visible.
 *
 * The 48px header is sized to the 32px control rhythm, not to hold a title:
 * that lives in `DashboardPageHeader`, a second band beneath it carrying the
 * activated route's title as the document's one `<h1>`, the page's own
 * actions (`DashboardPageActions`) and optional primary navigation
 * (`DashboardPageTabs`) — the breadcrumb's current crumb is no longer a
 * heading, since it would otherwise repeat the same text. For the
 * toolbar, routed content and page-header content share the same centred
 * responsive `container`. That shared container owns horizontal alignment and
 * the standard page spacing, while full-height workspaces explicitly opt out. The header
 * backgrounds and separators still span the full content column.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-dashboard-layout />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * Two things about the skip link. It precedes the sidebar because reaching the
 * page from the keyboard would otherwise mean passing every navigation row on
 * every navigation; its `href` keeps link semantics but its default is
 * prevented, since `<base href="/">` makes a bare fragment resolve against the
 * base and hard-navigate to the app root. And its padding sits behind
 * `focus:` on purpose — `not-sr-only` resets `padding` and `margin` to 0 and
 * outranks a bare `px-3`, which left the revealed link as bare text with the
 * background hugging the glyphs.
 */
@Component({
  selector: 'app-dashboard-layout',
  imports: [
    NgComponentOutlet,
    RouterOutlet,
    SlotOutlet,
    DashboardPageHeader,
    HlmSeparator,
    HlmSidebar,
    HlmSidebarContent,
    HlmSidebarFooter,
    HlmSidebarHeader,
    HlmSidebarInset,
    HlmSidebarTrigger,
    HlmSidebarWrapper,
  ],
  providers: [BreadcrumbService],
  templateUrl: './dashboard-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayout {
  //#region Properties
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
      'container mx-auto flex min-h-0 flex-1 flex-col',
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
   * Property panelContributions
   * @readonly
   *
   * @description
   * Every contribution competing for the contextual column.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {readonly ExclusiveSlotContribution[]}
   */
  private readonly panelContributions: readonly ExclusiveSlotContribution[] =
    inject<ExclusiveSlotContribution[]>(DASHBOARD_PANEL_SLOT, { optional: true }) ?? [];

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
   * @type {Signal<ExclusiveSlotContribution | null>}
   */
  protected readonly panel: Signal<ExclusiveSlotContribution | null> = computed(
    (): ExclusiveSlotContribution | null => resolveExclusiveSlot(this.panelContributions),
  );

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
   * @return {void}
   */
  protected skipToContent(event: Event): void {
    event.preventDefault();
    const mainContent = this.content()?.nativeElement;
    const target = mainContent?.getClientRects().length
      ? mainContent
      : (this.extensionContent()?.nativeElement ?? mainContent);
    target?.focus();
  }
  //#endregion
}
