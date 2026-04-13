import { Component, ChangeDetectionStrategy } from '@angular/core';

/**
 * Component DashboardLayoutContent
 * @class DashboardLayoutContent
 *
 * @description
 * Content component for dashboard layout, contains the main content of the page
 * and other relevant information for the user.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-dashboard-layout-content/>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout-content',
  templateUrl: './dashboard-layout-content.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutContent {}
