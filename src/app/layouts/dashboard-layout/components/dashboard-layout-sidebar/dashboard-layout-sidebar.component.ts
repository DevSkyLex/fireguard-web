import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { DashboardSidebarNavigationService } from '@layouts/dashboard-layout/services';
import {
  DashboardLayoutSidebarHeader,
  DashboardLayoutSidebarNavigation,
} from './components';

/**
 * Component DashboardLayoutSidebar
 * @class DashboardLayoutSidebar
 *
 * @description
 * The DashboardLayoutSidebar component is responsible for rendering the sidebar
 * navigation menu in the dashboard layout.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout-sidebar',
  imports: [
    DashboardLayoutSidebarHeader,
    DashboardLayoutSidebarNavigation,
  ],
  templateUrl: './dashboard-layout-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutSidebar {
  //#region Properties
  /**
   * Property navigationService
   * @readonly
   *
   * @description
   * Navigation service providing item slices for each sidebar variant.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {DashboardSidebarNavigationService}
   */
  protected readonly navigationService: DashboardSidebarNavigationService =
    inject<DashboardSidebarNavigationService>(DashboardSidebarNavigationService);

  /**
   * Property variant
   * @readonly
   *
   * @description
   * Rendering variant for this sidebar instance.
   * - `'primary'`: renders the global navigation items (Home + Account)
   *   without the search field; used for the always-visible desktop sidebar.
   * - `'mobile'` (default): renders all navigation items including the
   *   organization section with the search field; used for the mobile drawer.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<'primary' | 'mobile'>}
   */
  readonly variant = input<'primary' | 'mobile'>('mobile');

  /**
   * Property iconOnly
   * @readonly
   *
   * @description
   * When true, renders the navigation in icon-only mode (no labels).
   * Used for the tablet breakpoint of the primary sidebar.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  readonly iconOnly = input<boolean>(false);
  //#endregion
}
