import {
  computed,
  Component,
  ChangeDetectionStrategy,
  effect,
  inject,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
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
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments';
import { toServerFieldErrors, toUnmatchedViolations, type ServerFieldErrors } from '@shared/utils';
import type { CreateEquipmentFormData, CreateEquipmentFormValues } from './models';

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

  /**
   * Input serverError
   * @input
   *
   * @description
   * Last rejection from the parent page, as held by the store's call state.
   *
   * A 422 names the field the server refused; projecting it tells the user which
   * one to fix instead of leaving them with a generic toast.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);

  /** Server message per field, projected from the last 422. */
  protected readonly serverFieldErrors: Signal<ServerFieldErrors> = computed(() =>
    toServerFieldErrors(this.serverError()),
  );

  /** Message of the first violation naming no field of this form. */
  protected readonly unmatchedViolation: Signal<string | null> = computed(
    () =>
      toUnmatchedViolations(this.serverError(), ['type', 'brand', 'model', 'serialNumber'])[0]
        ?.message ?? null,
  );

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
   * Available equipment type options, imported from the canonical equipments
   * feature public API (`@features/organization/features/equipments`) so the
   * catalog lives in a single place. Spread into a mutable array for the
   * `p-select` `[options]` binding.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {{ readonly label: string; readonly value: string }[]}
   */
  protected readonly equipmentTypes: { readonly label: string; readonly value: string }[] = [
    ...EQUIPMENT_TYPE_OPTIONS,
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
