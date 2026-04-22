import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  type Signal,
} from '@angular/core';
import type { MenuItem } from 'primeng/api';
import { SidebarNavigation } from '@shared/components/sidebar-navigation';
import {
  DashboardSidebarNavigationService,
  DashboardSidebarService,
} from '@layouts/dashboard-layout/services';

/**
 * Component DashboardLayoutSidebarNavigation
 * @class DashboardLayoutSidebarNavigation
 *
 * @description
 * Layout adapter that bridges {@link DashboardSidebarNavigationService} and
 * {@link DashboardSidebarService} with the generic {@link SidebarNavigation}
 * shared component.
 *
 * Responsibilities:
 * - resolve the items to render (optional override via the `items` input or
 *   the merged `menuItems` signal from the service for the mobile drawer),
 * - forward search query reads and writes to the service,
 * - close the mobile sidebar on leaf item click.
 *
 * All visual rendering is delegated to {@link SidebarNavigation}.
 *
 * @version 2.0.0
 *
 * @example
 * ```html
 * <!-- Mobile drawer: all sections with search -->
 * <app-dashboard-layout-sidebar-navigation />
 *
 * <!-- Primary sidebar: primary items without search -->
 * <app-dashboard-layout-sidebar-navigation
 *   [items]="navigationService.primaryItems"
 *   [showSearch]="false"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout-sidebar-navigation',
  imports: [SidebarNavigation],
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
   * @type {InputSignal<Signal<MenuItem[]> | undefined>}
   */
  readonly items = input<Signal<MenuItem[]>>();

  /**
   * Property showSearch
   * @readonly
   *
   * @description
   * Whether to render the search input above the navigation menu.
   * Set to `false` for the primary sidebar.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  readonly showSearch = input<boolean>(true);

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
  protected readonly menuItems = computed<MenuItem[]>((): MenuItem[] => {
    const itemsSignal = this.items();
    return itemsSignal ? itemsSignal() : this.sidebarNavigationService.menuItems();
  });
  //#endregion

  //#region Methods
  /**
   * Method onSearchQueryChange
   * @method onSearchQueryChange
   *
   * @description
   * Forwards search query changes to the navigation service.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {string} value - New search query value.
   *
   * @returns {void}
   */
  protected onSearchQueryChange(value: string): void {
    this.sidebarNavigationService.setSearchQuery(value);
  }

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
  //#endregion
}
