import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DashboardLayoutUserProfile } from '../../dashboard-layout-user-profile/dashboard-layout-user-profile.component';

/**
 * Component DashboardLayoutSidebarFooter
 * @class DashboardLayoutSidebarFooter
 *
 * @description
 * Sidebar footer containing user profile information.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout-sidebar-footer',
  imports: [DashboardLayoutUserProfile],
  templateUrl: './dashboard-layout-sidebar-footer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutSidebarFooter {}
