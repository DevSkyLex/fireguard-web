import { Component, ChangeDetectionStrategy } from "@angular/core";

/**
 * Component DashboardLayoutHeader
 * @class DashboardLayoutHeader
 *
 * @description
 * Header component for dashboard layout, contains the logo, user profile
 * and other relevant information for the user.
 *
 * @version 1.0.0
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
  templateUrl: './dashboard-layout-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutHeader {}
