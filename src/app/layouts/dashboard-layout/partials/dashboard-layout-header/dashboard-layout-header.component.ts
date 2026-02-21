import { Component, ChangeDetectionStrategy, inject } from "@angular/core";
import { ButtonModule } from "primeng/button";
import { DashboardSidebarService } from "@layouts/dashboard-layout/services";
import { DashboardLayoutBreadcrumb } from '../dashboard-layout-breadcrumb/dashboard-layout-breadcrumb.component';
import { DashboardLayoutNotifications } from '../dashboard-layout-notifications/dashboard-layout-notifications.component';

/**
 * Component DashboardLayoutHeader
 * @class DashboardLayoutHeader
 *
 * @description
 * Header component for dashboard layout. Contains the mobile sidebar
 * toggle button and other relevant information for the user.
 *
 * Injects {@link DashboardSidebarService} to control sidebar visibility
 * without output chaining.
 *
 * @version 1.3.0
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
  imports: [ButtonModule, DashboardLayoutBreadcrumb, DashboardLayoutNotifications],
  templateUrl: './dashboard-layout-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutHeader {
  //#region Properties
  /**
   * Property sidebarService
   * @readonly
   *
   * @description
   * Injected DashboardSidebarService instance for
   * controlling sidebar visibility.
   *
   * @access private
   * @since 1.3.0
   *
   * @type {DashboardSidebarService}
   */
  protected readonly sidebarService: DashboardSidebarService =
    inject<DashboardSidebarService>(DashboardSidebarService);
  //#endregion
}
