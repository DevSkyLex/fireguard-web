import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import {
  AssistantStore,
  type AssistantStoreType,
} from '@features/organization/features/collaboration/state';
import { WorkspaceShellService } from '@layouts/workspace-layout';

/**
 * Component AssistantToggle
 * @class AssistantToggle
 *
 * @description
 * The conversation header's control for summoning the assistant panel.
 *
 * Unlike the info toggle it renders everywhere in the workspace: the assistant
 * is organization-scoped, so it is as available on a facility page as in a
 * channel.
 *
 * Opening forces the shell to show its right panel — without that, the slot the
 * assistant just claimed would render nothing — and closing hands back whatever
 * visibility was in effect before, so the info panel is not silently retired.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-assistant-toggle />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-assistant-toggle',
  imports: [TooltipModule],
  templateUrl: './assistant-toggle.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantToggle {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Owner of the panel's hold on the mono-active slot.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {AssistantStoreType}
   */
  protected readonly store: AssistantStoreType = inject(AssistantStore);

  /**
   * Property shell
   * @readonly
   *
   * @description
   * Shell state gating whether any panel is rendered at all.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WorkspaceShellService}
   */
  private readonly shell: WorkspaceShellService = inject(WorkspaceShellService);
  //#endregion

  //#region Methods
  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Opens or closes the assistant, keeping the shell's panel visibility in
   * step.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected toggle(): void {
    if (this.store.panelOpen()) {
      this.shell.setPanelVisible(this.store.closePanel());

      return;
    }

    this.store.openPanel(this.shell.panelVisible());
    this.shell.setPanelVisible(true);
  }
  //#endregion
}
