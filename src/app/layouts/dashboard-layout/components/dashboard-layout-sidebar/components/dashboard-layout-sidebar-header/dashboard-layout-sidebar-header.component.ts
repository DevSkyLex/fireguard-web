import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Component DashboardLayoutSidebarHeader
 * @class DashboardLayoutSidebarHeader
 *
 * @description
 * Sidebar header containing product branding.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout-sidebar-header',
  templateUrl: './dashboard-layout-sidebar-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutSidebarHeader {
  readonly iconOnly = input<boolean>(false);
}
