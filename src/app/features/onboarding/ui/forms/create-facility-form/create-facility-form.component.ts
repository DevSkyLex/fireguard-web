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
import type { FacilityType } from '@features/organization/features/facilities/models';
import type { CreateFacilityFormData } from './create-facility-form-data.type';
import type { CreateFacilityFormValues } from './create-facility-form-values.type';

/**
 * Component CreateFacilityForm
 * @class CreateFacilityForm
 *
 * @description
 * Presentational form component for creating a facility during
 * onboarding. Emits typed form values via `submitted` output.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-create-facility-form',
  imports: [ReactiveFormsModule, SelectModule, InputTextModule, ButtonModule, MessageModule],
  templateUrl: './create-facility-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateFacilityForm {
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
   * @type {OutputEmitterRef<CreateFacilityFormValues>}
   */
  public readonly submitted: OutputEmitterRef<CreateFacilityFormValues> =
    output<CreateFacilityFormValues>();
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
   * Property facilityTypes
   * @readonly
   *
   * @description
   * Available facility type options.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ label: string; value: FacilityType }[]}
   */
  protected readonly facilityTypes: { label: string; value: FacilityType }[] = [
    { label: 'Site', value: 'site' },
    { label: 'Building', value: 'building' },
    { label: 'Floor', value: 'floor' },
    { label: 'Zone', value: 'zone' },
    { label: 'Area', value: 'area' },
  ];

  /**
   * Property form
   * @readonly
   *
   * @description
   * Reactive form group for facility creation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormGroup<CreateFacilityFormData>}
   */
  protected readonly form: FormGroup<CreateFacilityFormData> =
    this.formBuilder.group<CreateFacilityFormData>({
      type: this.formBuilder.control<FacilityType>('site', [Validators.required]),
      name: this.formBuilder.control<string>('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(120),
      ]),
      address: this.formBuilder.control<string | null>(null),
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
    const formValues: CreateFacilityFormValues = this.form.getRawValue();
    this.submitted.emit(formValues);
  }
  //#endregion
}
