import { Component, ChangeDetectionStrategy } from '@angular/core';
import { DashboardLayoutPageHeader } from '../dashboard-layout-page-header/dashboard-layout-page-header.component';

/**
 * Component DashboardLayoutContent
 * @class DashboardLayoutContent
 *
 * @description
 * Content component for dashboard layout. Renders the route-driven page header
 * banner ({@link DashboardLayoutPageHeader}) above the projected page content.
 *
 * @version 1.1.0
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
  imports: [DashboardLayoutPageHeader],
  templateUrl: './dashboard-layout-content.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-full flex-col' },
})
export class DashboardLayoutContent {}
