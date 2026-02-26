import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BreadcrumbModule, BreadcrumbPassThroughOptions } from 'primeng/breadcrumb';
import { BreadcrumbService } from '@core/services/breadcrumb';

/**
 * Component DashboardLayoutBreadcrumb
 * @class DashboardLayoutBreadcrumb
 *
 * @description
 * Breadcrumb component for dashboard layout header.
 * Renders navigation trail based on active route.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-dashboard-layout-breadcrumb/>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout-breadcrumb',
  imports: [BreadcrumbModule],
  templateUrl: './dashboard-layout-breadcrumb.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutBreadcrumb {
  //#region Properties
  /**
   * Property breadcrumbService
   * @readonly
   *
   * @description
   * Service providing breadcrumb data and logic for dashboard layout.
   * Used to retrieve breadcrumb items based on active route.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {BreadcrumbService}
   */
  protected readonly breadcrumbService: BreadcrumbService =
    inject<BreadcrumbService>(BreadcrumbService);

  /**
   * Property breadcrumbPt
   * @readonly
   *
   * @description
   * PrimeNG Breadcrumb component configuration
   * for dashboard layout.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {object}
   */
  protected readonly breadcrumbPt: BreadcrumbPassThroughOptions = {
    root: { class: 'text-sm text-surface-500 p-0 bg-surface-0 dark:bg-surface-950 transition-colors' },
  };
  //#endregion
}
