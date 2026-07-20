import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
  signal,
  type InputSignal,
  type ModelSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

/** The backend's own bounds on a channel name; mirrored to fail before the round trip. */
const NAME_MIN: number = 2;
const NAME_MAX: number = 80;

/**
 * Component NewChannelDialog
 * @class NewChannelDialog
 *
 * @description
 * Asks for a channel name and nothing else — the create endpoint takes only a
 * name, everything else is derived server-side.
 *
 * Presentational: it neither creates nor navigates. The parent submits, keeps
 * `pending` true while the call is in flight, and closes the dialog itself.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-new-channel-dialog',
  imports: [FormsModule, ButtonModule, DialogModule, InputTextModule],
  templateUrl: './new-channel-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewChannelDialog {
  //#region Properties
  /**
   * Property visible
   *
   * @description
   * Two-way open state, so the dialog's own dismiss reaches the parent.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {ModelSignal<boolean>}
   */
  public readonly visible: ModelSignal<boolean> = model<boolean>(false);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether the create call is in flight.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * The trimmed channel name the member confirmed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly submitted: OutputEmitterRef<string> = output<string>();

  /**
   * Property name
   * @readonly
   *
   * @description
   * The field's live value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly name: WritableSignal<string> = signal<string>('');

  /**
   * Property nameMin
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {number}
   */
  protected readonly nameMin: number = NAME_MIN;

  /**
   * Property nameMax
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {number}
   */
  protected readonly nameMax: number = NAME_MAX;

  /**
   * Property isValid
   * @readonly
   *
   * @description
   * Mirrors the backend's 2..80 rule so an invalid name never costs a round
   * trip.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isValid: Signal<boolean> = computed((): boolean => {
    const length: number = this.name().trim().length;

    return length >= NAME_MIN && length <= NAME_MAX;
  });
  //#endregion

  //#region Methods
  /**
   * Method submit
   *
   * @description
   * Confirms the name. The parent closes the dialog once the call succeeds, so
   * a failure leaves the typed name in place.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected submit(): void {
    if (!this.isValid() || this.pending()) return;

    this.submitted.emit(this.name().trim());
  }

  /**
   * Method reset
   *
   * @description
   * Clears the field when the dialog closes, so reopening starts blank.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected reset(): void {
    this.name.set('');
  }
  //#endregion
}
