import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  input,
  signal,
  type InputSignal,
  type WritableSignal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { RadioCard } from './components';
import type { RadioCardOption } from './models';

/**
 * Component RadioCardGroup
 * @class RadioCardGroup
 *
 * @description
 * Accessible radio-button group rendered as a 2-column grid of
 * selectable cards. Integrates with Angular reactive forms via
 * `ControlValueAccessor` — use it with `formControlName` or
 * `ngModel` like any standard form control.
 *
 * @example
 * ```html
 * <app-radio-card-group formControlName="roleId" [options]="roleOptions()" />
 * ```
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-radio-card-group',
  imports: [RadioCard],
  templateUrl: './radio-card-group.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RadioCardGroup),
      multi: true,
    },
  ],
})
export class RadioCardGroup implements ControlValueAccessor {
  //#region Inputs
  /**
   * Input options
   * @readonly
   *
   * @description
   * List of options to render as radio cards.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<RadioCardOption[]>}
   */
  public readonly options: InputSignal<RadioCardOption[]> = input<RadioCardOption[]>([]);
  //#endregion

  //#region Properties
  /**
   * Property uid
   * @readonly
   *
   * @description
   * Unique prefix for radio button input IDs within this group
   * instance, preventing cross-instance conflicts.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly uid: string = `rcg-${crypto.randomUUID()}`;

  /**
   * Property value
   * @readonly
   *
   * @description
   * Currently selected value, kept in sync with the parent form
   * control via {@link writeValue}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<unknown>}
   */
  protected readonly value: WritableSignal<unknown> = signal<unknown>(null);

  /**
   * Property isDisabled
   * @readonly
   *
   * @description
   * Reflects the disabled state forwarded by the parent form control.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly isDisabled: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property onChange
   *
   * @description
   * Callback registered by Angular's form infrastructure via
   * {@link registerOnChange}.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {(value: unknown) => void}
   */
  private onChange: (value: unknown) => void = () => {};

  /**
   * Property onTouched
   *
   * @description
   * Callback registered by Angular's form infrastructure via
   * {@link registerOnTouched}.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {() => void}
   */
  private onTouched: () => void = () => {};
  //#endregion

  //#region Methods
  /**
   * Method select
   * @method select
   *
   * @description
   * Updates the internal signal and notifies the parent form control
   * of the new value and touched state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {unknown} value - The selected option value.
   *
   * @returns {void}
   */
  protected select(value: unknown): void {
    this.value.set(value);
    this.onChange(value);
    this.onTouched();
  }

  /**
   * Method writeValue
   * @method writeValue
   *
   * @description
   * Called by Angular when the parent form control value changes
   * programmatically.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {unknown} value - The new value.
   *
   * @returns {void}
   */
  public writeValue(value: unknown): void {
    this.value.set(value ?? null);
  }

  /**
   * Method registerOnChange
   * @method registerOnChange
   *
   * @access public
   * @since 1.0.0
   *
   * @param {(value: unknown) => void} fn
   * @returns {void}
   */
  public registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  /**
   * Method registerOnTouched
   * @method registerOnTouched
   *
   * @access public
   * @since 1.0.0
   *
   * @param {() => void} fn
   * @returns {void}
   */
  public registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /**
   * Method setDisabledState
   * @method setDisabledState
   *
   * @access public
   * @since 1.0.0
   *
   * @param {boolean} isDisabled
   * @returns {void}
   */
  public setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }
  //#endregion
}
