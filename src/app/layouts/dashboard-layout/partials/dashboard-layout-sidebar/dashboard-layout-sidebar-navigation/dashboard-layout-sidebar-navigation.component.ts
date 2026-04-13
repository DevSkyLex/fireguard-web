import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';
import { IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';
import type { MotionOptions } from '@primeuix/motion';
import type { MenuItem } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { DividerModule } from 'primeng/divider';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { PanelMenuModule, PanelMenuPassThroughOptions } from 'primeng/panelmenu';
import { RippleModule } from 'primeng/ripple';
import {
  DashboardSidebarNavigationService,
  DashboardSidebarService,
} from '@layouts/dashboard-layout/services';

/**
 * Component DashboardLayoutSidebarNavigation
 * @class DashboardLayoutSidebarNavigation
 *
 * @description
 * Sidebar navigation area with search and panel menu.
 *
 * @version 1.0.0
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
   * Service to control sidebar open/close behavior.
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
   * Service managing sidebar navigation items and filtering.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {DashboardSidebarNavigationService}
   */
  protected readonly sidebarNavigationService: DashboardSidebarNavigationService =
    inject<DashboardSidebarNavigationService>(DashboardSidebarNavigationService);

  /**
   * Property panelMenuPt
   * @readonly
   *
   * @description
   * Pass-through options for PrimeNG PanelMenu.
   *
   * @access protected
   * @since 1.0.0
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
   * @since 1.0.0
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
   * Property searchQuery
   * @readonly
   *
   * @description
   * Current search query applied to navigation items.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly searchQuery: Signal<string> = this.sidebarNavigationService.searchQuery;

  /**
   * Property menuItems
   * @readonly
   *
   * @description
   * Filtered navigation items.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly menuItems: Signal<MenuItem[]> = this.sidebarNavigationService.menuItems;

  /**
   * Property exactMatchOptions
   * @readonly
   *
   * @description
   * Router active options for exact route matching.
   *
   * @access private
   * @since 1.0.0
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
   * @since 1.0.0
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
   * Method onSearchInput
   * @method onSearchInput
   *
   * @description
   * Updates the search query for navigation filtering.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} value - Search input value.
   *
   * @returns {void}
   */
  protected onSearchInput(value: string): void {
    this.sidebarNavigationService.setSearchQuery(value);
  }

  /**
   * Method clearSearch
   * @method clearSearch
   *
   * @description
   * Clears the search query.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected clearSearch(): void {
    this.sidebarNavigationService.clearSearchQuery();
  }

  /**
   * Method onItemClick
   * @method onItemClick
   *
   * @description
   * Closes sidebar when a leaf navigation item is selected.
   *
   * @access protected
   * @since 1.0.0
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
   * Returns active route matching options based on item route.
   * Root route uses exact matching to avoid being active on all URLs.
   *
   * @access protected
   * @since 1.0.0
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
