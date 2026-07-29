import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import {
  AssistantStore,
  type AssistantStoreType,
  ChannelPanelStore,
} from '@features/organization/features/collaboration/state';
import { WorkspaceShellService } from '@layouts/workspace-layout';

/**
 * Component ChannelInfoToggle
 * @class ChannelInfoToggle
 *
 * @description
 * The conversation header's control for showing and hiding the channel info
 * panel.
 *
 * It renders only on a channel, because the panel it governs has nothing to
 * show anywhere else — a dead toggle is worse than no toggle.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-channel-info-toggle />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-channel-info-toggle',
  imports: [TooltipModule],
  templateUrl: './channel-info-toggle.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelInfoToggle {
  //#region Properties
  /**
   * Property shell
   * @readonly
   *
   * @description
   * Shell state owning the panel's open/closed intent.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WorkspaceShellService}
   */
  protected readonly shell: WorkspaceShellService = inject(WorkspaceShellService);

  /**
   * Property store
   * @readonly
   *
   * @description
   * Read only for its routed channel — the toggle owns no panel data.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InstanceType<typeof ChannelPanelStore>}
   */
  protected readonly store: InstanceType<typeof ChannelPanelStore> = inject(ChannelPanelStore);

  /**
   * Property assistant
   * @readonly
   *
   * @description
   * The other claimant on the panel slot, which outranks this one.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {AssistantStoreType}
   */
  private readonly assistant: AssistantStoreType = inject(AssistantStore);

  /**
   * Property isShowing
   * @readonly
   *
   * @description
   * Whether the info panel is what the slot is actually rendering.
   *
   * Not simply `panelVisible`: the assistant forces that flag on while it
   * holds the slot, so reading it alone would light this control up over a
   * panel that is not on screen.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isShowing: Signal<boolean> = computed(
    (): boolean => this.shell.panelVisible() && !this.assistant.panelOpen(),
  );
  //#endregion

  //#region Methods
  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Shows or hides the info panel, taking the slot back from the assistant
   * when it is the one holding it.
   *
   * @access protected
   * @since 1.1.0
   *
   * @return {void}
   */
  protected toggle(): void {
    if (this.assistant.panelOpen()) {
      // Reclaim rather than toggle: the member asked for *this* panel, so the
      // assistant's remembered visibility is discarded on purpose.
      this.assistant.closePanel();
      this.shell.setPanelVisible(true);

      return;
    }

    this.shell.togglePanel();
  }
  //#endregion
}
