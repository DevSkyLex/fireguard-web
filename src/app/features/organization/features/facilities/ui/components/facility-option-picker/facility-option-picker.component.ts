import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  model,
  output,
  signal,
  untracked,
  type InputSignal,
  type ModelSignal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { idleCallState, type CallState } from '@core/request-state';
import type { FacilityOption } from '@features/organization/features/facilities/models';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';

/**
 * Class FacilityOptionPicker
 * @class FacilityOptionPicker
 *
 * @description
 * Accessible server-paginated facility selector. Parents own the option store and all requests.
 */
@Component({
  selector: 'app-facility-option-picker',
  imports: [HlmButton, ...HlmComboboxImports],
  templateUrl: './facility-option-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityOptionPicker implements FormValueControl<string> {
  //#region Properties
  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Disables editing while the owning operation is pending.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input(false);

  /**
   * Property inputId
   * @readonly
   *
   * @description
   * Associates the outer field label with the native combobox input.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly inputId: InputSignal<string> = input('facility-option-picker');
  /**
   * Property options
   * @readonly
   *
   * @description
   * Facility choices in the current server page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly FacilityOption[]>}
   */
  public readonly options: InputSignal<readonly FacilityOption[]> = input<
    readonly FacilityOption[]
  >([]);

  /**
   * Property value
   * @readonly
   *
   * @description
   * Selected facility id shared with the parent's Signal Form.
   *
   * @access public
   * @since unreleased
   *
   * @type {ModelSignal<string>}
   */
  public readonly value: ModelSignal<string> = model<string>('');

  /**
   * Property page
   * @readonly
   *
   * @description
   * Current server page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly page: InputSignal<number> = input(1);

  /**
   * Property pageCount
   * @readonly
   *
   * @description
   * Server page count for the current search.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly pageCount: InputSignal<number> = input(1);

  /**
   * Property callState
   * @readonly
   *
   * @description
   * Request lifecycle supplied by the facilities option store.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<CallState>}
   */
  public readonly callState: InputSignal<CallState> = input<CallState>(idleCallState());

  /**
   * Property placeholder
   * @readonly
   *
   * @description
   * Accessible search hint shown on the picker.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly placeholder: InputSignal<string> = input(
    $localize`:@@facility.picker.search:Search facilities`,
  );

  /**
   * Property searchChanged
   * @readonly
   *
   * @description
   * Search emitted for a server query.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly searchChanged: OutputEmitterRef<string> = output<string>();

  /**
   * Property pageChanged
   * @readonly
   *
   * @description
   * Requested server page, including retry.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<number>}
   */
  public readonly pageChanged: OutputEmitterRef<number> = output<number>();

  /**
   * Property selectedOption
   * @readonly
   *
   * @description
   * Retains the chosen label when its record leaves the current page.
   *
   * @access private
   * @since unreleased
   *
   * @type {WritableSignal<FacilityOption | null>}
   */
  private readonly selectedOption: WritableSignal<FacilityOption | null> = signal(null);

  /**
   * Property remoteFilter
   * @readonly
   *
   * @description
   * Leaves option filtering to the API query.
   *
   * @access protected
   * @since unreleased
   *
   * @type {() => boolean}
   */
  protected readonly remoteFilter: () => boolean = () => true;

  /**
   * Property labelOf
   * @readonly
   *
   * @description
   * Resolves the selection from the current page or its retained record.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: string) => string}
   */
  protected readonly labelOf: (value: string) => string = (value) =>
    value === ''
      ? $localize`:@@facility.picker.any:Any facility`
      : (this.options().find((option) => option.value === value)?.label ??
        (this.selectedOption()?.value === value ? this.selectedOption()?.label : null) ??
        $localize`:@@common.unknownFacility:Unknown facility`);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Retains only the chosen record as pages and server searches change.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      const value = this.value();
      const record = this.options().find((option) => option.value === value);
      untracked(() => {
        if (!value) this.selectedOption.set(null);
        else if (record) this.selectedOption.set(record);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method pick
   * @method pick
   *
   * @description
   * Accepts only scalar facility identities from the native combobox.
   *
   * @access protected
   * @since unreleased
   *
   * @param {unknown} value - Native single-choice output.
   *
   * @returns {void}
   */
  protected pick(value: unknown): void {
    if (this.disabled()) return;
    if (typeof value === 'string') this.value.set(value);
    else if (value === null || value === undefined) this.value.set('');
  }
  //#endregion
}
