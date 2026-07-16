import { Component, ChangeDetectionStrategy } from '@angular/core';
import { DashboardLayoutPageHeader } from '../dashboard-layout-page-header/dashboard-layout-page-header.component';

/**
 * Component DashboardLayoutContent
 * @class DashboardLayoutContent
 *
 * @description
 * Content plane of the dashboard shell. Constrains the route-driven page
 * header banner ({@link DashboardLayoutPageHeader}) and the projected page
 * content to a centered max-width column (1200px) matching the header's
 * padding formula. The main region is deliberately unpadded — each routed
 * page owns its own padding (`p-3 sm:p-6 md:p-7 lg:p-8` by convention).
 *
 * @version 2.0.0
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
