import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  InputSignal,
  type Signal,
} from '@angular/core';
import { DashboardSidebarNavigationService } from '@layouts/dashboard-layout/services';
import { SIDEBAR_SLOT, type SidebarContribution } from '@layouts/dashboard-layout/slots/sidebar';
import {
  DashboardLayoutSidebarFooter,
  DashboardLayoutSidebarHeader,
  DashboardLayoutSidebarNavigation,
} from './components';

/**
 * Component DashboardLayoutSidebar
 * @class DashboardLayoutSidebar
 *
 * @description
 * Single tinted sidebar of the dashboard shell: brand row, lead shell
 * widgets (SIDEBAR_SLOT `lead` region), navigation, and footer widgets
 * (SIDEBAR_SLOT `footer` region). Slot widgets are hidden in icon-only mode.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout-sidebar',
  imports: [
    NgComponentOutlet,
    DashboardLayoutSidebarHeader,
    DashboardLayoutSidebarNavigation,
    DashboardLayoutSidebarFooter,
  ],
  templateUrl: './dashboard-layout-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutSidebar {
  //#region Properties
  /**
   * Property navigationService
   * @readonly
   *
   * @description
   * Navigation service providing item slices for each sidebar variant.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {DashboardSidebarNavigationService}
   */
  protected readonly navigationService: DashboardSidebarNavigationService =
    inject<DashboardSidebarNavigationService>(DashboardSidebarNavigationService);

  /**
   * Property contributions
   * @readonly
   *
   * @description
   * Shell widget contributions injected via the `SIDEBAR_SLOT` multi-provider
   * token, sorted by ascending `order`.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {SidebarContribution[]}
   */
  private readonly contributions: readonly SidebarContribution[] = (
    inject(SIDEBAR_SLOT, { optional: true }) ?? []
  ).toSorted((a: SidebarContribution, b: SidebarContribution): number => a.order - b.order);

  /**
   * Property leadContributions
   * @readonly
   *
   * @description
   * Widgets rendered between the brand row and the navigation.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<readonly SidebarContribution[]>}
   */
  protected readonly leadContributions: Signal<readonly SidebarContribution[]> = computed(
    (): readonly SidebarContribution[] =>
      this.contributions.filter(
        (contribution: SidebarContribution): boolean =>
          contribution.region === 'lead' && (contribution.available?.() ?? true),
      ),
  );

  /**
   * Property footerContributions
   * @readonly
   *
   * @description
   * Widgets pinned at the bottom of the sidebar.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<readonly SidebarContribution[]>}
   */
  protected readonly footerContributions: Signal<readonly SidebarContribution[]> = computed(
    (): readonly SidebarContribution[] =>
      this.contributions.filter(
        (contribution: SidebarContribution): boolean =>
          contribution.region === 'footer' && (contribution.available?.() ?? true),
      ),
  );

  /**
   * Property contentContributions
   * @readonly
   *
   * @description
   * Widgets rendered inside the sidebar's scroller, below the navigation —
   * the messaging channel sections.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {Signal<readonly SidebarContribution[]>}
   */
  protected readonly contentContributions: Signal<readonly SidebarContribution[]> = computed(
    (): readonly SidebarContribution[] =>
      this.contributions.filter(
        (contribution: SidebarContribution): boolean =>
          contribution.region === 'content' && (contribution.available?.() ?? true),
      ),
  );

  /**
   * Property variant
   * @readonly
   *
   * @description
   * Rendering variant for this sidebar instance.
   * - `'primary'`: always-visible desktop sidebar, supports icon-only mode.
   * - `'mobile'` (default): sidebar rendered inside the mobile drawer,
   *   always expanded.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<'primary' | 'mobile'>}
   */
  public readonly variant: InputSignal<'primary' | 'mobile'> = input<'primary' | 'mobile'>(
    'mobile',
  );

  /**
   * Property iconOnly
   * @readonly
   *
   * @description
   * When true, renders the navigation in icon-only mode (no labels).
   * Used for the tablet breakpoint of the primary sidebar.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly iconOnly: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property collapsible
   * @readonly
   *
   * @description
   * When true, the sidebar header exposes a toggle button allowing the user
   * to collapse/expand the primary sidebar between its full and icon-only
   * forms. Only meaningful for the desktop `'primary'` variant.
   *
   * @access public
   * @since 4.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly collapsible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property isIconOnly
   * @readonly
   *
   * @description
   * Whether this instance currently renders in icon-only (rail) mode —
   * only the primary variant collapses; the mobile drawer stays expanded.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isIconOnly: Signal<boolean> = computed(
    (): boolean => this.variant() === 'primary' && this.iconOnly(),
  );
  //#endregion
}
