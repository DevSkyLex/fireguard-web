import { ChangeDetectionStrategy, Component, inject, type Signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePenLine, lucideSparkles } from '@ng-icons/lucide';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import {
  AssistantStore,
  type AssistantStoreType,
} from '@features/organization/features/collaboration/state';
import { SLOT_PRESENTATION, type SlotPresentation } from '@shared/layout-slot';
import { HlmButton } from '@shared/ui/button';
import { HlmItem, HlmItemContent, HlmItemMedia, HlmItemTitle } from '@shared/ui/item';
import { HlmSheetImports } from '@shared/ui/sheet';
import { AssistantPanel } from '../assistant-panel';

/**
 * Component AssistantToggle
 * @class AssistantToggle
 *
 * @description
 * Owns the assistant header trigger and its native Spartan sheet. The sheet opens on the right
 * for desktop interaction and from the bottom for mobile interaction without recreating its state.
 *
 * @version 1.2.0
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
  imports: [
    NgIcon,
    AssistantPanel,
    HlmButton,
    HlmItem,
    HlmItemContent,
    HlmItemMedia,
    HlmItemTitle,
    HlmSheetImports,
  ],
  providers: [provideIcons({ lucidePenLine, lucideSparkles })],
  templateUrl: './assistant-toggle.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantToggle {
  //#region Properties
  /**
   * Property isMobileInteractionMode
   * @readonly
   * @description Selects the sheet edge without changing the assistant lifecycle.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly isMobileInteractionMode: Signal<boolean> = inject(
    INTERACTION_CAPABILITIES_PORT,
  ).isMobileInteractionMode;

  /**
   * Property slotPresentation
   * @readonly
   *
   * @description
   * Presentation requested by the layout slot hosting this assistant trigger.
   * The mobile drawer uses a Spartan item row; desktop keeps the compact icon
   * button.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {SlotPresentation}
   */
  protected readonly slotPresentation: SlotPresentation =
    inject<SlotPresentation>(SLOT_PRESENTATION);

  /**
   * Property store
   * @readonly
   *
   * @description
   * Assistant transcript and panel state shared by the trigger and sheet content.
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
   * @returns {void}
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
