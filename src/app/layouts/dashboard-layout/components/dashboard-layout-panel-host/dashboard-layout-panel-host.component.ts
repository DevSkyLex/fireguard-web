import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SHELL_PANEL_WIDTH_PX } from '@layouts/dashboard-layout/constants';
import { DashboardPanelService } from '@layouts/dashboard-layout/services';
import type { PanelContribution } from '@layouts/dashboard-layout/slots/panel';

/**
 * Component DashboardLayoutPanelHost
 * @class DashboardLayoutPanelHost
 *
 * @description
 * Renders the open contextual right-hand panels side by side, each in its own
 * scroller with a titled header and a close button.
 *
 * The host does not decide *which* panels exist — `DashboardPanelService` does,
 * from `PANEL_SLOT` — only how many may share the viewport. `maxPanels` is set
 * by the shell from the current breakpoint.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-dashboard-layout-panel-host [maxPanels]="2" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-layout-panel-host',
  imports: [NgComponentOutlet, ButtonModule],
  templateUrl: './dashboard-layout-panel-host.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardLayoutPanelHost {
  //#region Inputs
  /**
   * Property maxPanels
   * @readonly
   *
   * @description
   * How many panels may render at once. Extra open panels stay open in the
   * service but are not rendered, so widening the viewport reveals them again
   * without the user having to re-open anything.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly maxPanels: InputSignal<number> = input<number>(1);

  /**
   * Property overlay
   * @readonly
   *
   * @description
   * Whether this host renders inside the mobile drawer rather than as an
   * inline column.
   *
   * It changes the dismiss affordance, not the styling: an inline panel sits
   * beside the page and is *closed*, so a cross is right; the drawer covers
   * the page, and covering something is a place you come *back* from. A cross
   * there reads as "discard", which is not what dismissing a details panel
   * does.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly overlay: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Properties
  /**
   * Property panelService
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {DashboardPanelService}
   */
  protected readonly panelService: DashboardPanelService =
    inject<DashboardPanelService>(DashboardPanelService);

  /**
   * Property panelWidth
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {number}
   */
  protected readonly panelWidth: number = SHELL_PANEL_WIDTH_PX;

  /**
   * Property visiblePanels
   * @readonly
   *
   * @description
   * The open panels the current viewport can show, outermost last.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly PanelContribution[]>}
   */
  protected readonly visiblePanels: Signal<readonly PanelContribution[]> = computed(
    (): readonly PanelContribution[] => this.panelService.openPanels().slice(-this.maxPanels()),
  );
  //#endregion
}
