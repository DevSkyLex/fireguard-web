import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';

/**
 * Component RadioCard
 * @class RadioCard
 *
 * @description
 * Presentational component that renders a single selectable card
 * backed by a visually-hidden native `<input type="radio">`. The
 * card itself is the focus target — a `:has(:focus-visible)` ring
 * frames the whole card, not a nested control — and selection is
 * conveyed by the card border/background plus a CSS radio indicator.
 * Uses a native input rather than a nested PrimeNG radio to keep the
 * focus on the card and avoid a component-in-component. Intended for
 * use inside {@link RadioCardGroup}.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-radio-card',
  templateUrl: './radio-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadioCard {
  //#region Inputs
  /**
   * Input inputId
   * @readonly
   *
   * @description
   * Unique HTML `id` for the underlying `<input type="radio">`,
   * used to associate the `<label>` via the `for` attribute.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly inputId: InputSignal<string> = input.required<string>();

  /**
   * Input name
   * @readonly
   *
   * @description
   * Radio group name shared across all cards of the same group.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly name: InputSignal<string> = input.required<string>();

  /**
   * Input value
   * @readonly
   *
   * @description
   * The value this card represents within the radio group.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<unknown>}
   */
  public readonly value: InputSignal<unknown> = input.required<unknown>();

  /**
   * Input selectedValue
   * @readonly
   *
   * @description
   * The currently selected value of the group, used to derive
   * the checked state of this card.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<unknown>}
   */
  public readonly selectedValue: InputSignal<unknown> = input<unknown>(null);

  /**
   * Input label
   * @readonly
   *
   * @description
   * Primary text displayed inside the card.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input.required<string>();

  /**
   * Input description
   * @readonly
   *
   * @description
   * Optional secondary text displayed below the label.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null | undefined>}
   */
  public readonly description: InputSignal<string | null | undefined> = input<
    string | null | undefined
  >(null);

  public readonly icon: InputSignal<string | null | undefined> = input<string | null | undefined>(
    null,
  );

  /**
   * Input disabled
   * @readonly
   *
   * @description
   * Whether this card is in a disabled state.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Output selected
   * @readonly
   *
   * @description
   * Emitted when the user selects this card. Carries the card's
   * value so the parent group can update the form control.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<unknown>}
   */
  public readonly selected: OutputEmitterRef<unknown> = output<unknown>();
  //#endregion
}
