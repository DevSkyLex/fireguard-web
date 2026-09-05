import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  type Signal,
  type TemplateRef,
} from '@angular/core';
import { PageTabsService } from '@core/page-tabs';

/**
 * Component DashboardPageTabs
 * @class DashboardPageTabs
 *
 * @description
 * Renders the active page's primary content tabs beneath its title inside the
 * dashboard page header. The feature supplies the Spartan markup and behavior.
 * Its wrapper republishes Spartan's horizontal `group/tabs` styling context
 * because a projected `TemplateRef` no longer has the declaring `hlm-tabs` as
 * a DOM ancestor, even though it retains that component's injection context.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-page-tabs',
  imports: [NgTemplateOutlet],
  templateUrl: './dashboard-page-tabs.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageTabs {
  //#region Properties
  /**
   * Property pageTabs
   * @readonly
   *
   * @description
   * Registry containing the currently activated page's tab template.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {PageTabsService}
   */
  private readonly pageTabs: PageTabsService = inject<PageTabsService>(PageTabsService);

  /**
   * Property tabs
   * @readonly
   *
   * @description
   * Template rendered below the title row, or `null` on pages without content tabs.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<unknown> | null>}
   */
  protected readonly tabs: Signal<TemplateRef<unknown> | null> = this.pageTabs.tabs;
  //#endregion
}
