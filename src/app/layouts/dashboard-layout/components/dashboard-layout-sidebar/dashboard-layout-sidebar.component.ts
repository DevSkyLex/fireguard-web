import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DividerModule } from 'primeng/divider';
import {
  DashboardLayoutSidebarFooter,
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
    DashboardLayoutSidebarFooter,
    DividerModule,
  ],
  templateUrl: './dashboard-layout-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutSidebar {}
