import {
  Component,
  ChangeDetectionStrategy,
  effect,
  inject,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
  type FormGroup,
} from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import type { InspectionResult, InspectorType } from '@core/models/inspection';
import type { CreateInspectionFormData } from './create-inspection-form-data.type';
import type { CreateInspectionFormValues } from './create-inspection-form-values.type';

/**
 * Interface EquipmentOption
 *
 * @description
 * Lightweight option shape used by the equipment selector.
 *
 * @since 1.0.0
 */
export interface EquipmentOption {
  readonly id: string;
  readonly label: string;
}

/**
 * Component CreateInspectionForm
 * @class CreateInspectionForm
 *
 * @description
 * Presentational form component for creating an inspection during
 * onboarding. Emits typed form values via `submitted` output.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-create-inspection-form',
  imports: [
    ReactiveFormsModule,
    DatePickerModule,
    SelectModule,
    InputTextModule,
    ButtonModule,
    MessageModule,
  ],
  templateUrl: './create-inspection-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateInspectionForm {
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

  /**
   * Input equipmentOptions
   * @readonly
   *
   * @description
   * Available equipment options for the equipment selector.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<EquipmentOption[]>}
   */
  public readonly equipmentOptions: InputSignal<EquipmentOption[]> =
    input<EquipmentOption[]>([]);
  //#endregion

  //#region Outputs
  /**
   * Output submitted
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<CreateInspectionFormValues>}
   */
  public readonly submitted: OutputEmitterRef<CreateInspectionFormValues> =
    output<CreateInspectionFormValues>();
  //#endregion

  //#region Properties
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

  /**
   * Property resultOptions
   * @readonly
   *
   * @description
   * Available inspection result options.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ label: string; value: InspectionResult }[]}
   */
  protected readonly resultOptions: { label: string; value: InspectionResult }[] = [
    { label: 'Pass', value: 'pass' },
    { label: 'Fail', value: 'fail' },
    { label: 'Partial', value: 'partial' },
  ];

  /**
   * Property inspectorTypeOptions
   * @readonly
   *
   * @description
   * Available inspector type options.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ label: string; value: InspectorType }[]}
   */
  protected readonly inspectorTypeOptions: { label: string; value: InspectorType }[] = [
    { label: 'Internal technician', value: 'user' },
    { label: 'External contractor', value: 'external' },
  ];

  /**
   * Property form
   * @readonly
   *
   * @description
   * Reactive form group for inspection creation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormGroup<CreateInspectionFormData>}
   */
  protected readonly form: FormGroup<CreateInspectionFormData> =
    this.formBuilder.group<CreateInspectionFormData>({
      equipmentId: this.formBuilder.control<string>('', [Validators.required]),
      result: this.formBuilder.control<InspectionResult>('pass', [Validators.required]),
      performedAt: this.formBuilder.control<string>(new Date().toISOString().slice(0, 16), [
        Validators.required,
      ]),
      inspectorType: this.formBuilder.control<InspectorType>('user', [Validators.required]),
      inspectorName: this.formBuilder.control<string>('', [
        Validators.required,
        Validators.minLength(2),
      ]),
    });
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
   * Method onSubmit
   * @method onSubmit
   *
   * @description
   * Validates and emits the form values.
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
    const formValues: CreateInspectionFormValues = this.form.getRawValue();
    this.submitted.emit(formValues);
  }
  //#endregion
}
