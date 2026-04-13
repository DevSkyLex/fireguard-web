import { ChangeDetectionStrategy, Component, computed, inject, Signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { BreadcrumbModule, BreadcrumbPassThroughOptions } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
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
  imports: [RouterModule, BreadcrumbModule, ButtonModule, MenuModule],
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
   * Property ELLIPSIS_ID
   * @readonly
   *
   * @description
   * Sentinel identifier for the synthetic ellipsis item inserted
   * into `displayItems` when the breadcrumb trail has 3+ entries.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {string}
   */
  protected readonly ELLIPSIS_ID: string = '__ellipsis__';

  /**
   * Property displayItems
   * @readonly
   *
   * @description
   * Model passed to `p-breadcrumb`. When there are 3 or more items,
   * middle entries are replaced with a single ellipsis sentinel so
   * only the first and last items are rendered inline. The ellipsis
   * item triggers a `p-menu` popup exposing the hidden middle items.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly displayItems: Signal<MenuItem[]> = computed((): MenuItem[] => {
    const items: MenuItem[] = this.breadcrumbService.items();
    if (items.length < 3) return items;
    return [items[0], { id: this.ELLIPSIS_ID }, items[items.length - 1]];
  });

  /**
   * Property collapsedItems
   * @readonly
   *
   * @description
   * Menu items shown inside the ellipsis popup.
   * Contains items[1] through items[n-2] (the hidden middle entries).
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<MenuItem[]>}
   */
  protected readonly collapsedItems: Signal<MenuItem[]> = computed((): MenuItem[] => {
    const items: MenuItem[] = this.breadcrumbService.items();
    if (items.length < 3) return [];
    return items.slice(1, -1);
  });

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
    root: {
      class: 'text-sm text-surface-500 p-0 bg-surface-0 dark:bg-surface-950 transition-colors',
    },
  };
  //#endregion
}
