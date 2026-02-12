import { Component, ChangeDetectionStrategy } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { DashboardLayoutHeader, DashboardLayoutSidebar, DashboardLayoutContent } from "@layouts/dashboard-layout/partials";

/**
 * Component DashboardLayout
 * @class DashboardLayout
 *
 * @description
 * Layout component for dashboard pages like
 * home, profile, settings, etc.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-dashboard-layout/>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout',
  imports: [
    RouterOutlet,
    DashboardLayoutHeader,
    DashboardLayoutSidebar,
    DashboardLayoutContent,
  ],
  templateUrl: './dashboard-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayout {}
