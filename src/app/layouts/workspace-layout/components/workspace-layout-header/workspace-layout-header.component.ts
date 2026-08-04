import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import type { MenuItem } from 'primeng/api';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { BreadcrumbService } from '@core/breadcrumb';
import { WorkspaceShellService } from '@layouts/workspace-layout/services';
import {
  CONVERSATION_HEADER_SLOT,
  type ConversationHeaderContribution,
} from '@layouts/workspace-layout/slots/conversation-header';
import {
  WORKSPACE_PAGE_HEADER_SLOT,
  type PageHeaderContribution,
} from '@layouts/workspace-layout/slots/page-header';

/**
 * Component WorkspaceLayoutHeader
 * @class WorkspaceLayoutHeader
 *
 * @description
 * The 56px bar topping the workspace main column: a mobile back affordance,
 * the route trail, the current page's own actions, and the shell tool cluster.
 *
 * This is what replaces `DashboardLayoutPageHeader` for routes hosted here.
 * That banner rendered an `<h1>` for any route declaring a `title`, with no
 * opt-out; several existing list pages have no in-page heading of their own and
 * depend on it, so the trail's last crumb carries the page name instead.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-workspace-layout-header />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-workspace-layout-header',
  imports: [BreadcrumbModule, ButtonModule, NgComponentOutlet],
  templateUrl: './workspace-layout-header.component.html',
  host: {
    class:
      'flex h-14 shrink-0 items-center gap-1 border-b border-surface-200 pr-3 pl-4 dark:border-surface-800',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceLayoutHeader {
  //#region Properties
  /**
   * Property shell
   * @readonly
   *
   * @description
   * Shell state, used to return to the channel list on mobile.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WorkspaceShellService}
   */
  protected readonly shell: WorkspaceShellService =
    inject<WorkspaceShellService>(WorkspaceShellService);

  /**
   * Property sidebarToggleLabel
   * @readonly
   *
   * @description
   * Accessible name of the desktop sidebar toggle, naming the action rather
   * than the state so a screen-reader user hears what the press will do.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<string>}
   */
  protected readonly sidebarToggleLabel: Signal<string> = computed((): string =>
    this.shell.sidebarCollapsed()
      ? $localize`:@@workspace.header.sidebar.show:Show sidebar`
      : $localize`:@@workspace.header.sidebar.hide:Hide sidebar`,
  );

  /**
   * Property breadcrumbService
   * @readonly
   *
   * @description
   * Route trail, provided by the layout so hosted routes keep the breadcrumbs
   * they declare through `data.breadcrumb` and title resolvers.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {BreadcrumbService}
   */
  protected readonly breadcrumbService: BreadcrumbService =
    inject<BreadcrumbService>(BreadcrumbService);

  /**
   * Property pageActions
   * @readonly
   *
   * @description
   * The current page's own actions, in render order. Keeps feature helpers such
   * as `withInterventionHeaderActions()` working after migration.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly PageHeaderContribution[]>}
   */
  protected readonly pageActions: Signal<readonly PageHeaderContribution[]> = computed(
    (): readonly PageHeaderContribution[] =>
      this.pageHeaderContributions.toSorted(
        (a: PageHeaderContribution, b: PageHeaderContribution): number => a.order - b.order,
      ),
  );

  /**
   * Property tools
   * @readonly
   *
   * @description
   * Shell-level controls docked at the far right, in render order.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly ConversationHeaderContribution[]>}
   */
  protected readonly tools: Signal<readonly ConversationHeaderContribution[]> = computed(
    (): readonly ConversationHeaderContribution[] =>
      this.toolContributions.toSorted(
        (a: ConversationHeaderContribution, b: ConversationHeaderContribution): number =>
          a.order - b.order,
      ),
  );

  /**
   * Property breadcrumbPt
   * @readonly
   *
   * @description
   * Strips the PrimeNG breadcrumb's own background and padding so it reads as
   * part of the 56px bar rather than a card inside it, and collapses the trail
   * to the current page below `lg`.
   *
   * The full trail does not fit a phone: `Home › Organization › Interventions ›
   * Intervention` wrapped the 56px bar onto two lines and still cut the last
   * crumb mid-word, so the one part that names where the member actually is was
   * the part that got truncated. Ancestors are hidden rather than shortened —
   * the hamburger beside it already goes back, so the trail was carrying
   * navigation the header offers twice.
   *
   * Done in CSS rather than by swapping the model on `isDesktop()`: that signal
   * is `false` during SSR, which would render the collapsed trail into the HTML
   * and then visibly expand it on a desktop hydration.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Record<string, { class: string }>}
   */
  protected readonly breadcrumbPt: Record<string, { class: string }> = {
    root: {
      class:
        '!border-0 !bg-transparent !p-0 max-lg:[&_.p-breadcrumb-home-item]:hidden max-lg:[&_.p-breadcrumb-separator]:hidden max-lg:[&_.p-breadcrumb-item:not(:last-child)]:hidden',
    },
    item: { class: 'min-w-0' },
    itemLabel: { class: 'block truncate' },
  };

  /**
   * Property pageHeaderContributions
   * @readonly
   *
   * @description
   * Raw page-action contributions, injected as a multi-provider array.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {PageHeaderContribution[]}
   */
  private readonly pageHeaderContributions: PageHeaderContribution[] =
    inject<PageHeaderContribution[]>(WORKSPACE_PAGE_HEADER_SLOT, { optional: true }) ?? [];

  /**
   * Property toolContributions
   * @readonly
   *
   * @description
   * Raw tool-cluster contributions, injected as a multi-provider array.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ConversationHeaderContribution[]}
   */
  private readonly toolContributions: ConversationHeaderContribution[] =
    inject<ConversationHeaderContribution[]>(CONVERSATION_HEADER_SLOT, { optional: true }) ?? [];

  /**
   * Property items
   * @readonly
   *
   * @description
   * Trail entries, with the last one styled as the current page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly items: Signal<MenuItem[]> = computed((): MenuItem[] =>
    this.breadcrumbService.items(),
  );
  //#endregion
}
