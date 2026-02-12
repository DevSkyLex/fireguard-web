import { Component, ChangeDetectionStrategy } from "@angular/core";

/**
 * Component DashboardLayoutSidebar
 * @class DashboardLayoutSidebar
 *
 * @description
 * Sidebar component for dashboard layout, contains navigation links
 * and other relevant information for the user.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-dashboard-layout-sidebar/>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout-sidebar',
  templateUrl: './dashboard-layout-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutSidebar {}
