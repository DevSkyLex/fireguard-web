import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import type { SidebarContribution } from '@layouts/dashboard-layout/slots/sidebar';
import { DashboardLayoutSlotOutlet } from '../../../dashboard-layout-slot-outlet/dashboard-layout-slot-outlet.component';

/**
 * Component DashboardLayoutSidebarFooter
 * @class DashboardLayoutSidebarFooter
 *
 * @description
 * Sidebar footer rendering the shell widgets contributed to the sidebar
 * `footer` region (account menu).
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout-sidebar-footer',
  imports: [DashboardLayoutSlotOutlet],
  templateUrl: './dashboard-layout-sidebar-footer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutSidebarFooter {
  /**
   * Property contributions
   * @readonly
   *
   * @description
   * Footer-region sidebar contributions to render, already sorted by the
   * parent sidebar.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<readonly SidebarContribution[]>}
   */
  public readonly contributions: InputSignal<readonly SidebarContribution[]> = input<
    readonly SidebarContribution[]
  >([]);
}
