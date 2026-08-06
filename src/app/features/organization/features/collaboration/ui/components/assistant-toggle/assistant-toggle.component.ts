import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSparkles } from '@ng-icons/lucide';
import {
  AssistantStore,
  type AssistantStoreType,
} from '@features/organization/features/collaboration/state';
import { HlmButton } from '@shared/ui/button';
import { HlmSheetImports } from '@shared/ui/sheet';
import { AssistantPanel } from '../assistant-panel';

/**
 * Component AssistantToggle
 * @class AssistantToggle
 *
 * @description
 * The header control that summons the assistant, and the sheet it opens.
 *
 * It sits in the header rather than the sidebar because the assistant is not a
 * destination: it has no URL, and opens over whatever page is already showing.
 * It is offered on every signed-in page, since the assistant is scoped to the
 * organization rather than to a route.
 *
 * The panel rides in a right-anchored `hlm-sheet` at every width rather than in
 * the shell's contextual column, so it never competes with the routed page for
 * space and gets a backdrop, a focus trap and Escape dismissal from spartan.
 * Control and surface live together because both read the one `panelOpen`
 * signal, which is what keeps the trigger's `aria-expanded` honest.
 *
 * Absent entirely without `organization.assistant.use` — a control that only
 * leads to a refusal is worse than no control.
 *
 * @version 1.1.0
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
  imports: [NgIcon, AssistantPanel, HlmButton, HlmSheetImports],
  providers: [provideIcons({ lucideSparkles })],
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
   * Owner of the panel's hold on the shell's contextual column.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {AssistantStoreType}
   */
  protected readonly store: AssistantStoreType = inject<AssistantStoreType>(AssistantStore);
  //#endregion

  //#region Methods
  /**
   * Method onSheetStateChanged
   * @method onSheetStateChanged
   *
   * @description
   * Mirrors the sheet's own state back into the store, whichever of the
   * backdrop, the panel's close button or Escape produced it.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {'open' | 'closed'} state - The sheet's new state.
   *
   * @return {void}
   */
  protected onSheetStateChanged(state: 'open' | 'closed'): void {
    if (state === 'open') {
      this.store.openPanel();
      return;
    }

    this.store.closePanel();
  }
  //#endregion
}
