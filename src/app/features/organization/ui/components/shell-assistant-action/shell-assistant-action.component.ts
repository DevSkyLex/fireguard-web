import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { SHELL_PANEL_PORT, type ShellPanelPort } from '@core/shell-panel';
import { ASSISTANT_PANEL_ID } from '@features/organization/features/assistant/providers';

/**
 * Component ShellAssistantAction
 * @class ShellAssistantAction
 *
 * @description
 * Header sparkles action toggling the assistant shell panel from any workspace
 * view, matching the prototype's persistent header tool cluster.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-shell-assistant-action',
  imports: [TooltipModule],
  templateUrl: './shell-assistant-action.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellAssistantAction {
  //#region Properties
  /**
   * Property shellPanel
   * @readonly
   *
   * @description
   * Core-owned port controlling the shell's right-hand panels.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ShellPanelPort}
   */
  private readonly shellPanel: ShellPanelPort = inject<ShellPanelPort>(SHELL_PANEL_PORT);

  /**
   * Property isOpen
   * @readonly
   *
   * @description
   * Whether the assistant panel is currently open, driving the pressed state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isOpen: Signal<boolean> = computed((): boolean =>
    this.shellPanel.openPanelIds().includes(ASSISTANT_PANEL_ID),
  );
  //#endregion

  //#region Methods
  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Opens the assistant panel when closed, closes it when open.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected toggle(): void {
    this.shellPanel.toggle(ASSISTANT_PANEL_ID);
  }
  //#endregion
}
