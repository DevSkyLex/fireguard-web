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
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import type { EquipmentFormData } from './equipment-form-data.type';
import type { EquipmentFormValues } from './equipment-form-values.type';

/**
 * Component EquipmentForm
 * @class EquipmentForm
 *
 * @description
 * Presentational form component for creating equipment.
 * Emits raw form values via `submitted` output. All store and API
 * interaction is handled by the parent page.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-form',
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    MessageModule,
    IconFieldModule,
    InputIconModule,
  ],
  templateUrl: './equipment-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentForm {
  //#region Inputs
  /**
   * Input loading
   * @readonly
   *
   * @description
   * Whether a submit operation is currently in-flight.
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
   * @description
   * Emitted when the user submits a valid form.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<EquipmentFormValues>}
   */
  public readonly submitted: OutputEmitterRef<EquipmentFormValues> = output<EquipmentFormValues>();

  /**
   * Output cancelled
   * @readonly
   *
   * @description
   * Emitted when the user cancels the form.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();
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
   * Property form
   * @readonly
   *
   * @description
   * Reactive form group for equipment creation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormGroup<EquipmentFormData>}
   */
  protected readonly form: FormGroup<EquipmentFormData> = this.formBuilder.group<EquipmentFormData>(
    {
      type: this.formBuilder.control<string>('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(255),
      ]),
      subType: this.formBuilder.control<string>(''),
      brand: this.formBuilder.control<string>(''),
      model: this.formBuilder.control<string>(''),
      serialNumber: this.formBuilder.control<string>(''),
      locationLabel: this.formBuilder.control<string>(''),
    },
  );
  //#endregion

  //#region Constructor
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
   * Validates the form and emits the values if valid.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onSubmit(): void {
    if (this.form.invalid) return;
    const formValues: EquipmentFormValues = this.form.getRawValue();
    this.submitted.emit(formValues);
  }

  /**
   * Method onCancel
   * @method onCancel
   *
   * @description
   * Emits the cancelled event.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onCancel(): void {
    this.cancelled.emit();
  }
  //#endregion
}
