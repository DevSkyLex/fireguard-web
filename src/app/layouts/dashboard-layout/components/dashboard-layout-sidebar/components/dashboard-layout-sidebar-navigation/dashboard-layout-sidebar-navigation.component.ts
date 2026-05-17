import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  type Signal,
} from '@angular/core';
import { type IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';
import type { MotionOptions } from '@primeuix/motion';
import type { MenuItem } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { DividerModule } from 'primeng/divider';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { PanelMenuModule, type PanelMenuPassThroughOptions } from 'primeng/panelmenu';
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
 * drawer. Renders a PrimeNG PanelMenu with an optional search field. Drives
 * its state from {@link DashboardSidebarNavigationService} and closes the
 * mobile drawer via {@link DashboardSidebarService} on leaf item click.
 *
 * Design is intentionally independent from the secondary sidebar: the two
 * panels are expected to diverge visually.
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
  imports: [
    BadgeModule,
    DividerModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    PanelMenuModule,
    RippleModule,
    RouterLink,
    RouterLinkActive,
    TooltipModule,
  ],
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
  readonly iconOnly = input<boolean>(false);

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

  /**
   * Property flatItems
   * @readonly
   *
   * @description
   * Flattened list of all leaf navigation items across sections.
   * Used in icon-only mode to render a flat icon strip without
   * PanelMenu grouping.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly flatItems = computed<MenuItem[]>((): MenuItem[] =>
    this.menuItems().flatMap((section: MenuItem): MenuItem[] => section.items ?? []),
  );

  /**
   * Property panelMenuPt
   * @readonly
   *
   * @description
   * Pass-through options for PrimeNG PanelMenu.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {PanelMenuPassThroughOptions}
   */
  protected readonly panelMenuPt: PanelMenuPassThroughOptions = {
    submenuIcon: { class: 'hidden' },
    submenu: { class: 'ml-6 border-l border-surface-200 pl-3' },
  };

  /**
   * Property panelMenuMotionOptions
   * @readonly
   *
   * @description
   * Animation options for submenu enter/leave transitions.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {MotionOptions}
   */
  protected readonly panelMenuMotionOptions: MotionOptions = {
    type: 'transition',
    autoHeight: true,
    duration: { enter: 250, leave: 200 },
    enterClass: {
      from: 'h-0 opacity-0',
      active: 'overflow-hidden transition-[height,opacity] duration-250 ease-in-out',
      to: 'h-[var(--pui-motion-height)] opacity-100',
    },
    leaveClass: {
      from: 'h-[var(--pui-motion-height)] opacity-100',
      active: 'overflow-hidden transition-[height,opacity] duration-200 ease-in-out',
      to: 'h-0 opacity-0',
    },
  };

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

  /**
   * Method onClearSearch
   * @method onClearSearch
   *
   * @description
   * Clears the current search query.
   *
   * @access protected
   * @since 3.0.0
   *
   * @returns {void}
   */
  protected onClearSearch(): void {
    this.onSearchQueryChange('');
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
  //#endregion
}
