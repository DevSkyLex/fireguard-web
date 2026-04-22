import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DashboardSidebarNavigationService } from '@layouts/dashboard-layout/services';
import { DashboardLayoutSidebarNavigation } from '../dashboard-layout-sidebar/components';

/**
 * Component DashboardLayoutSecondarySidebar
 * @class DashboardLayoutSecondarySidebar
 *
 * @description
 * Contextual sidebar rendered to the right of the primary sidebar when an
 * organization is active. Displays organization-scoped navigation items
 * (Dashboard, Facilities, Equipments, Inspections) filtered by the current
 * member's permissions and the shared search query.
 *
 * The component is intentionally thin: it delegates all navigation state
 * to {@link DashboardSidebarNavigationService} via the `secondaryItems`
 * signal and passes it to {@link DashboardLayoutSidebarNavigation}.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-dashboard-layout-secondary-sidebar />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout-secondary-sidebar',
  imports: [DashboardLayoutSidebarNavigation],
  templateUrl: './dashboard-layout-secondary-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutSecondarySidebar {
  //#region Properties
  /**
   * Property navigationService
   * @readonly
   *
   * @description
   * Navigation service providing the organization-scoped item slice
   * for the secondary sidebar.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {DashboardSidebarNavigationService}
   */
  protected readonly navigationService: DashboardSidebarNavigationService =
    inject<DashboardSidebarNavigationService>(DashboardSidebarNavigationService);
  //#endregion
}
