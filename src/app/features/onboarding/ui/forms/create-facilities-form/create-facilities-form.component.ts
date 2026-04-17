import {
  Component,
  ChangeDetectionStrategy,
  effect,
  inject,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import {
  FormArray,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import type { SetupFacilityType } from '@features/organization/setup';
import type { CreateFacilityFormData } from '../create-facility-form/create-facility-form-data.type';
import type { CreateFacilityFormValues } from '../create-facility-form/create-facility-form-values.type';
import type { CreateFacilitiesFormData } from './create-facilities-form-data.type';

/**
 * Component CreateFacilitiesForm
 * @class CreateFacilitiesForm
 *
 * @description
 * Presentational form component for creating one or more facilities during
 * onboarding. Rows can be added up to `maxRows`. Emits an array of typed
 * form values via the `submitted` output.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-create-facilities-form',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, MessageModule, SelectModule],
  templateUrl: './create-facilities-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateFacilitiesForm {
  //#region Dependencies
  /**
   * Property formBuilder
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {NonNullableFormBuilder}
   */
  private readonly formBuilder: NonNullableFormBuilder =
    inject<NonNullableFormBuilder>(NonNullableFormBuilder);
  //#endregion

  //#region Inputs
  /**
   * Input loading
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Output submitted
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<CreateFacilityFormValues[]>}
   */
  public readonly submitted: OutputEmitterRef<CreateFacilityFormValues[]> =
    output<CreateFacilityFormValues[]>();
  //#endregion

  //#region Properties
  /**
   * Property maxRows
   * @readonly
   *
   * @description
   * Maximum number of facility rows allowed in the form.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {number}
   */
  protected readonly maxRows: number = 5;

  /**
   * Property facilityTypes
   * @readonly
   *
   * @description
   * Available facility type options.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ label: string; value: SetupFacilityType }[]}
   */
  protected readonly facilityTypes: { label: string; value: SetupFacilityType }[] = [
    { label: 'Site', value: 'site' },
    { label: 'Building', value: 'building' },
    { label: 'Floor', value: 'floor' },
    { label: 'Zone', value: 'zone' },
    { label: 'Area', value: 'area' },
  ];

  /**
   * Property rowCount
   *
   * @description
   * Reactive tracker for the number of rows, used for the submit button label.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<number>}
   */
  protected readonly rowCount: WritableSignal<number> = signal<number>(1);

  /**
   * Property form
   * @readonly
   *
   * @description
   * Reactive form group containing a FormArray of facility rows.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormGroup<CreateFacilitiesFormData>}
   */
  protected readonly form: FormGroup<CreateFacilitiesFormData> = this.formBuilder.group({
    rows: this.formBuilder.array<FormGroup<CreateFacilityFormData>>([this.buildRow()]),
  });

  /**
   * Getter rows
   *
   * @description
   * Shorthand accessor for the rows FormArray.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {FormArray<FormGroup<CreateFacilityFormData>>}
   */
  protected get rows(): FormArray<FormGroup<CreateFacilityFormData>> {
    return this.form.controls.rows;
  }
  //#endregion

  //#region Constructor
  /**
   * @constructor
   *
   * @description
   * Disables/enables the form reactively based on the loading input.
   */
  public constructor() {
    effect(() => {
      if (this.loading()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method buildRow
   * @method buildRow
   *
   * @description
   * Builds a new empty facility row FormGroup with the same validators
   * as the single `CreateFacilityForm`.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {FormGroup<CreateFacilityFormData>}
   */
  private buildRow(): FormGroup<CreateFacilityFormData> {
    return this.formBuilder.group<CreateFacilityFormData>({
      type: this.formBuilder.control<SetupFacilityType>('site', [Validators.required]),
      name: this.formBuilder.control<string>('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(120),
      ]),
      address: this.formBuilder.control<string | null>(null),
    });
  }

  /**
   * Method addRow
   * @method addRow
   *
   * @description
   * Appends a new empty facility row, up to `maxRows`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected addRow(): void {
    if (this.rows.length >= this.maxRows) return;
    this.rows.push(this.buildRow());
    this.rowCount.set(this.rows.length);
  }

  /**
   * Method removeRow
   * @method removeRow
   *
   * @description
   * Removes the row at the given index, keeping at least one row.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number} index - Index of the row to remove.
   * @returns {void}
   */
  protected removeRow(index: number): void {
    if (this.rows.length <= 1) return;
    this.rows.removeAt(index);
    this.rowCount.set(this.rows.length);
  }

  /**
   * Method onSubmit
   * @method onSubmit
   *
   * @description
   * Validates all rows and emits the array of facility values.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const values: CreateFacilityFormValues[] = this.rows.controls.map((row) => row.getRawValue());
    this.submitted.emit(values);
  }
  //#endregion
}
