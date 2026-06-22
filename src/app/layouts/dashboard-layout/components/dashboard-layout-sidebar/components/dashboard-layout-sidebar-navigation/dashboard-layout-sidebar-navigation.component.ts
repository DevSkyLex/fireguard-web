import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  InputSignal,
  type Signal,
} from '@angular/core';
import { type IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { RippleModule } from 'primeng/ripple';
import { TooltipModule } from 'primeng/tooltip';
import {
  DashboardSidebarNavigationService,
  DashboardSidebarService,
} from '@layouts/dashboard-layout/services';

/**
 * Component DashboardLayoutSidebarNavigation
 * @class DashboardLayoutSidebarNavigation
 *
 * @description
 * Layout-owned navigation component for the primary sidebar and the mobile
 * drawer. Renders a shared list-based navigation, driven by
 * {@link DashboardSidebarNavigationService}, and closes the mobile drawer
 * via {@link DashboardSidebarService} on leaf item click.
 *
 * Design is intentionally independent from the secondary sidebar: the two
 * panels are expected to diverge visually.
 *
 * @version 2.0.0
 *
 * @example
 * ```html
 * <!-- Mobile drawer: all sections -->
 * <app-dashboard-layout-sidebar-navigation />
 *
 * <!-- Primary sidebar: primary items only -->
 * <app-dashboard-layout-sidebar-navigation
 *   [items]="navigationService.primaryItems"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout-sidebar-navigation',
  imports: [BadgeModule, RippleModule, RouterLink, RouterLinkActive, TooltipModule],
  templateUrl: './dashboard-layout-sidebar-navigation.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutSidebarNavigation {
  //#region Properties
  /**
   * Property sidebarService
   * @readonly
   *
   * @description
   * Service to close the mobile sidebar when a leaf item is selected.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {DashboardSidebarService}
   */
  protected readonly sidebarService: DashboardSidebarService =
    inject<DashboardSidebarService>(DashboardSidebarService);

  /**
   * Property sidebarNavigationService
   * @readonly
   *
   * @description
   * Service managing navigation items and search filtering for the
   * primary sidebar and the mobile drawer.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {DashboardSidebarNavigationService}
   */
  protected readonly sidebarNavigationService: DashboardSidebarNavigationService =
    inject<DashboardSidebarNavigationService>(DashboardSidebarNavigationService);

  /**
   * Property items
   * @readonly
   *
   * @description
   * Optional signal input that overrides the default navigation items.
   * When provided, the component renders the given signal's items instead
   * of the merged {@link DashboardSidebarNavigationService#menuItems}.
   * Pass {@link DashboardSidebarNavigationService#primaryItems} for the
   * primary sidebar.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<MenuItem[] | undefined>}
   */
  public readonly items: InputSignal<MenuItem[] | undefined> = input<MenuItem[] | undefined>();

  /**
   * Property iconOnly
   * @readonly
   *
   * @description
   * When `true`, renders a compact icon-only version of the navigation:
   * labels, badges inline text, and section headers are hidden;
   * icons are centred and a right-side tooltip shows the item label.
   * Intended for the narrow primary desktop sidebar.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly iconOnly: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property menuItems
   * @readonly
   *
   * @description
   * Resolved navigation items. Uses the `items` override when provided;
   * otherwise falls back to the merged `menuItems` from the service
   * (all sections — used for the mobile drawer).
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly menuItems: Signal<MenuItem[]> = computed<MenuItem[]>((): MenuItem[] => {
    const overrideItems: MenuItem[] | undefined = this.items();
    if (overrideItems) return overrideItems;
    return this.sidebarNavigationService.menuItems();
  });

  /**
   * Property navAriaLabel
   * @readonly
   *
   * @description
   * Localized accessible label for the navigation landmark. Distinguishes
   * the primary sidebar from the merged mobile-drawer navigation.
   *
   * @access protected
   * @since 3.2.0
   *
   * @type {Signal<string>}
   */
  protected readonly navAriaLabel: Signal<string> = computed<string>((): string =>
    this.items()
      ? $localize`:@@layout.nav.primaryAria:Primary navigation`
      : $localize`:@@layout.nav.sidebarAria:Sidebar navigation`,
  );

  /**
   * Property exactMatchOptions
   * @readonly
   *
   * @description
   * Router active options for exact route matching (used for root `/`).
   *
   * @access private
   * @since 3.0.0
   *
   * @type {IsActiveMatchOptions}
   */
  private readonly exactMatchOptions: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  };

  /**
   * Property subsetMatchOptions
   * @readonly
   *
   * @description
   * Router active options for non-root route matching.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {IsActiveMatchOptions}
   */
  private readonly subsetMatchOptions: IsActiveMatchOptions = {
    paths: 'subset',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  };
  //#endregion

  //#region Methods
  /**
   * Method onItemClick
   * @method onItemClick
   *
   * @description
   * Closes the mobile sidebar when a leaf navigation item is selected.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {MenuItem} item - Clicked navigation item.
   *
   * @returns {void}
   */
  protected onItemClick(item: MenuItem): void {
    if (item.routerLink && !item.items?.length) {
      this.sidebarService.close();
    }
  }

  /**
   * Method getRouterLinkActiveOptions
   * @method getRouterLinkActiveOptions
   *
   * @description
   * Returns active route matching options based on the item's route.
   * Root route uses exact matching to avoid being active on all URLs.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {MenuItem['routerLink']} routerLink - Navigation item route.
   *
   * @returns {IsActiveMatchOptions}
   */
  protected getRouterLinkActiveOptions(routerLink: MenuItem['routerLink']): IsActiveMatchOptions {
    if (typeof routerLink === 'string' && routerLink === '/') {
      return this.exactMatchOptions;
    }

    return this.subsetMatchOptions;
  }

  /**
   * Method isNumericBadge
   * @method isNumericBadge
   *
   * @description
   * Returns true when the given badge value is purely numeric. Used to
   * pick between a discrete count style and a labelled pill style.
   *
   * @access protected
   * @since 3.1.0
   *
   * @param {string | undefined} badge - Badge value to inspect.
   *
   * @returns {boolean}
   */
  protected isNumericBadge(badge: string | undefined): boolean {
    return !!badge && /^\d+$/.test(badge);
  }
  //#endregion
}
