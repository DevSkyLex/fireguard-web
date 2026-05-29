import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { DashboardSidebarService } from '@layouts/dashboard-layout/services';

/**
 * Component DashboardLayoutSidebarHeader
 * @class DashboardLayoutSidebarHeader
 *
 * @description
 * Sidebar header containing product branding and, on the desktop primary
 * sidebar, the collapse/expand toggle button.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout-sidebar-header',
  imports: [TooltipModule],
  templateUrl: './dashboard-layout-sidebar-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutSidebarHeader {
  /**
   * Property sidebarService
   * @readonly
   *
   * @description
   * Layout-scoped sidebar service used to toggle the primary sidebar
   * collapsed (icon-only) state.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {DashboardSidebarService}
   */
  protected readonly sidebarService: DashboardSidebarService =
    inject<DashboardSidebarService>(DashboardSidebarService);

  /**
   * Property iconOnly
   * @readonly
   *
   * @description
   * When true, renders the compact icon-only header (logo centred, no label).
   *
   * @access public
   * @since 1.0.0
   */
  readonly iconOnly = input<boolean>(false);

  /**
   * Property collapsible
   * @readonly
   *
   * @description
   * When true, exposes the collapse/expand toggle button so the user can
   * switch the primary sidebar between its full and icon-only forms.
   *
   * @access public
   * @since 2.0.0
   */
  readonly collapsible = input<boolean>(false);
}
