import { NgComponentOutlet, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DashboardPageHeaderService } from '@layouts/dashboard-layout/services';

/**
 * Component DashboardLayoutPageHeader
 * @class DashboardLayoutPageHeader
 *
 * @description
 * Page header banner rendered by the dashboard layout above the routed page
 * content. Displays the active route's title and optional description on the
 * left and an optional, route-supplied action component on the right
 * (rendered via `NgComponentOutlet`), laid out with `justify-between`.
 *
 * The banner is route-driven through {@link DashboardPageHeaderService}: it
 * renders only when the active route declares a `data.pageHeader`
 * configuration, leaving pages without one untouched.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-dashboard-layout-page-header />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout-page-header',
  imports: [NgComponentOutlet, TitleCasePipe],
  templateUrl: './dashboard-layout-page-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutPageHeader {
  //#region Properties
  /**
   * Property pageHeaderService
   * @readonly
   *
   * @description
   * Layout-scoped service exposing the active page header configuration
   * resolved from the route tree.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {DashboardPageHeaderService}
   */
  protected readonly pageHeaderService: DashboardPageHeaderService =
    inject<DashboardPageHeaderService>(DashboardPageHeaderService);
  //#endregion
}
