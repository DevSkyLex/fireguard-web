import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, type Signal } from '@angular/core';
import {
  DashboardPanelRegistry,
  type DashboardPagePanel as DashboardPagePanelRegistration,
} from '../../services/dashboard-panel-registry/dashboard-panel-registry.service';

/**
 * Component DashboardPagePanel
 * @class DashboardPagePanel
 *
 * @description Projects the active page's contextual template with its declaration context intact.
 * @since 1.0.0
 */
@Component({
  selector: 'app-dashboard-page-panel',
  imports: [NgTemplateOutlet],
  templateUrl: './dashboard-page-panel.component.html',
  host: { class: 'flex h-full min-h-0 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPagePanel {
  /**
   * Property panel
   * @readonly
   * @description Active template registered by the routed page.
   * @access protected
   * @since 1.0.0
   * @type {Signal<DashboardPagePanelRegistration | null>}
   */
  protected readonly panel: Signal<DashboardPagePanelRegistration | null> =
    inject(DashboardPanelRegistry).panel;
}
