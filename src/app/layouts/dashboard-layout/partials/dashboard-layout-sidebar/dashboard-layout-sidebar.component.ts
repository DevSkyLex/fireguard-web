import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DividerModule } from 'primeng/divider';
import { DashboardLayoutSidebarFooter } from './dashboard-layout-sidebar-footer/dashboard-layout-sidebar-footer.component';
import { DashboardLayoutSidebarHeader } from './dashboard-layout-sidebar-header/dashboard-layout-sidebar-header.component';
import { DashboardLayoutSidebarNavigation } from './dashboard-layout-sidebar-navigation/dashboard-layout-sidebar-navigation.component';

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
