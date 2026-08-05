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
import {
  DASHBOARD_HEADER_ACTIONS_SLOT,
  DASHBOARD_HEADER_SLOT,
  DASHBOARD_PANEL_SLOT,
  DASHBOARD_SIDEBAR_FOOTER_SLOT,
  DASHBOARD_SIDEBAR_HEADER_SLOT,
  DASHBOARD_SIDEBAR_NAV_SLOT,
} from './slots';

/**
 * Component DashboardLayout
 * @class DashboardLayout
 *
 * @description
 * The application shell, built on spartan's `inset` sidebar variant: the sidebar
 * keeps the page canvas while the main column floats above it as a rounded card,
 * carrying the sidebar trigger, the page tools and the routed outlet. A
 * mono-active contextual panel repeats that card on the right.
 *
 * Everything it renders comes from slots, so the shell knows no feature. The
 * sidebar itself is spartan's — collapse state, its cookie, the Ctrl/Cmd+B
 * shortcut and the mobile sheet all come from `HlmSidebarService`, and are not
 * reimplemented here.
 *
 * The shell never scrolls: it is `overflow-hidden` and each column owns its own
 * scroller, so a pinned toolbar stays put while its content moves.
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
    RouterOutlet,
    SlotOutlet,
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
   * Property main
   * @readonly
   *
   * @description
   * The main column, focused by the skip link.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<ElementRef<HTMLElement> | undefined>}
   */
  private readonly main: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('main');

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
   * Moves focus to the main column, bypassing the whole sidebar.
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
    this.main()?.nativeElement.focus();
  }
  //#endregion
}
