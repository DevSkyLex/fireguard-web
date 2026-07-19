import { NgComponentOutlet } from '@angular/common';
import { Component, ChangeDetectionStrategy, inject, input, type InputSignal } from '@angular/core';
import {
  DashboardSidebarService,
  DashboardHeaderActionsService,
} from '@layouts/dashboard-layout/services';
import { DashboardLayoutBreadcrumb } from '../dashboard-layout-breadcrumb/dashboard-layout-breadcrumb.component';
import { DashboardLayoutSearch } from '../dashboard-layout-search/dashboard-layout-search.component';

/**
 * Component DashboardLayoutHeader
 * @class DashboardLayoutHeader
 *
 * @description
 * Header (topbar) of the dashboard shell: mobile sidebar toggle, breadcrumb,
 * and topbar slot actions. Its horizontal padding grows with the viewport so
 * the header content stays aligned with the centered max-width content
 * column below it.
 *
 * @version 2.0.0
 *
 * @example
 * ```html
 * <app-dashboard-layout-header/>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout-header',
  imports: [NgComponentOutlet, DashboardLayoutBreadcrumb, DashboardLayoutSearch],
  templateUrl: './dashboard-layout-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutHeader {
  //#region Inputs
  /**
   * Property showMenuButton
   * @readonly
   *
   * @description
   * Whether to offer the navigation toggle. The shell owns the decision: it is
   * true exactly while the rail and sidebar live in the drawer. Passing it down
   * keeps one source of truth for the breakpoint instead of a `lg:hidden` class
   * that can drift from the layout's own media query.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly showMenuButton: InputSignal<boolean> = input<boolean>(true);
  //#endregion

  //#region Properties
  /**
   * Property sidebarService
   * @readonly
   *
   * @description
   * Injected DashboardSidebarService instance for
   * controlling sidebar visibility.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {DashboardSidebarService}
   */
  protected readonly sidebarService: DashboardSidebarService =
    inject<DashboardSidebarService>(DashboardSidebarService);

  /**
   * Property headerActionsService
   * @readonly
   *
   * @description
   * Injected DashboardHeaderActionsService instance providing
   * the sorted list of header action components.
   *
   * @access protected
   * @since 1.4.0
   *
   * @type {DashboardHeaderActionsService}
   */
  protected readonly headerActionsService: DashboardHeaderActionsService =
    inject<DashboardHeaderActionsService>(DashboardHeaderActionsService);
  //#endregion
}
