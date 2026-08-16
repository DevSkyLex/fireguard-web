import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { Map, type MapClickEvent, type MapCoordinates } from '@shared/map';
import { HlmButton } from '@shared/ui/button';
import { HlmDialogImports } from '@shared/ui/dialog';

/**
 * Component FacilityMapPickerDialog
 * @class FacilityMapPickerDialog
 *
 * @description
 * The "Pick on map" affordance shared by `FacilityCreateForm` and
 * `FacilityInformationPanel`: an `hlm-dialog` hosting an interactive
 * `@shared/map`, so a click resolves a latitude/longitude pair. Purely
 * presentational (`ARCHITECTURE.md` §10.5) — it owns no coordinate state,
 * closes itself the moment a point is picked, and the caller's own
 * latitude/longitude inputs remain the field of record: they stay editable
 * and this dialog only ever patches them.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-map-picker-dialog',
  imports: [Map, HlmButton, ...HlmDialogImports],
  templateUrl: './facility-map-picker-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityMapPickerDialog {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the dialog is open. Owned by the caller.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property center
   * @readonly
   * @description Where the map opens, resolved by the caller (`resolveFacilityMapCenter`).
   * @access public
   * @since 1.0.0
   * @type {InputSignal<MapCoordinates | undefined>}
   */
  public readonly center: InputSignal<MapCoordinates | undefined> = input<
    MapCoordinates | undefined
  >(undefined);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   * @description The dialog wants to open or close.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property picked
   * @readonly
   * @description The coordinates the map click resolved to.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<MapCoordinates>}
   */
  public readonly picked: OutputEmitterRef<MapCoordinates> = output<MapCoordinates>();
  //#endregion

  //#region Properties
  /**
   * Property dialogState
   * @readonly
   * @description The overlay state, derived from {@link visible} so there is no second copy of the truth.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly dialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.visible() ? 'open' : 'closed',
  );
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @description Relays a dismissal — Escape, the backdrop, Cancel — ignoring the echo of a change the caller already made.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - The overlay's new state.
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    this.visibleChange.emit(isOpen);
  }

  /**
   * Method onMapClicked
   * @description Emits the picked coordinates and closes the dialog.
   * @access protected
   * @since 1.0.0
   * @param {MapClickEvent} event - The clicked position.
   * @returns {void}
   */
  protected onMapClicked(event: MapClickEvent): void {
    this.picked.emit(event);
    this.visibleChange.emit(false);
  }
  //#endregion
}
