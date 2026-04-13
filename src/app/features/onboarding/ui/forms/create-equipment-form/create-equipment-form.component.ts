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
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import type { CreateEquipmentFormData } from './create-equipment-form-data.type';
import type { CreateEquipmentFormValues } from './create-equipment-form-values.type';

/**
 * Component CreateEquipmentForm
 * @class CreateEquipmentForm
 *
 * @description
 * Presentational form component for creating an equipment during
 * onboarding. Emits typed form values via `submitted` output.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-create-equipment-form',
  imports: [ReactiveFormsModule, SelectModule, InputTextModule, ButtonModule, MessageModule],
  templateUrl: './create-equipment-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateEquipmentForm {
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
   * @type {OutputEmitterRef<CreateEquipmentFormValues>}
   */
  public readonly submitted: OutputEmitterRef<CreateEquipmentFormValues> =
    output<CreateEquipmentFormValues>();
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
   * Property equipmentTypes
   * @readonly
   *
   * @description
   * Available equipment type options.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ label: string; value: string }[]}
   */
  protected readonly equipmentTypes: { label: string; value: string }[] = [
    { label: 'Fire extinguisher', value: 'fire_extinguisher' },
    { label: 'Smoke detector', value: 'smoke_detector' },
    { label: 'Heat detector', value: 'heat_detector' },
    { label: 'Sprinkler', value: 'sprinkler' },
    { label: 'Fire alarm panel', value: 'fire_alarm_panel' },
    { label: 'Hydrant', value: 'hydrant' },
    { label: 'Fire door', value: 'fire_door' },
    { label: 'Emergency lighting', value: 'emergency_lighting' },
    { label: 'Access control', value: 'access_control' },
    { label: 'Camera', value: 'camera' },
    { label: 'Gas detector', value: 'gas_detector' },
    { label: 'Other', value: 'other' },
  ];

  /**
   * Property form
   * @readonly
   *
   * @description
   * Reactive form group for equipment creation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormGroup<CreateEquipmentFormData>}
   */
  protected readonly form: FormGroup<CreateEquipmentFormData> =
    this.formBuilder.group<CreateEquipmentFormData>({
      type: this.formBuilder.control<string>('fire_extinguisher', [Validators.required]),
      brand: this.formBuilder.control<string | null>(null),
      model: this.formBuilder.control<string | null>(null),
      serialNumber: this.formBuilder.control<string | null>(null),
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
    const formValues: CreateEquipmentFormValues = this.form.getRawValue();
    this.submitted.emit(formValues);
  }
  //#endregion
}
