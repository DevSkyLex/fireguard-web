import {
  Component,
  ChangeDetectionStrategy,
  computed,
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
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments/options';
import { toServerFieldErrors, toUnmatchedViolations, type ServerFieldErrors } from '@shared/utils';
import type { EquipmentFormData, EquipmentFormValues } from './models';

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
  imports: [ReactiveFormsModule, InputTextModule, SelectModule, ButtonModule, MessageModule],
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

  /**
   * Input serverError
   * @input
   *
   * @description
   * Last rejection from the parent page, as held by the store's call state.
   *
   * A 422 names the field it refused — a serial number already registered, an
   * unknown type — which no client-side validator can anticipate.
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
      toUnmatchedViolations(this.serverError(), [
        'type',
        'subType',
        'brand',
        'model',
        'serialNumber',
        'locationLabel',
      ])[0]?.message ?? null,
  );

  /** Existing equipment when the form is used in edit mode. */
  public readonly equipment: InputSignal<EquipmentOutput | null> = input<EquipmentOutput | null>(
    null,
  );
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
      type: this.formBuilder.control<string>('', [Validators.required]),
      subType: this.formBuilder.control<string>(''),
      brand: this.formBuilder.control<string>(''),
      model: this.formBuilder.control<string>(''),
      serialNumber: this.formBuilder.control<string>(''),
      locationLabel: this.formBuilder.control<string>(''),
    },
  );

  /**
   * Property typeOptions
   * @readonly
   *
   * @description
   * Localized equipment type choices for the type `p-select`, shared with the
   * table filter. Constrains input to the backend `EquipmentType` value set.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ReadonlyArray<{ readonly label: string; readonly value: string }>}
   */
  protected readonly typeOptions: { readonly label: string; readonly value: string }[] = [
    ...EQUIPMENT_TYPE_OPTIONS,
  ];
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

    effect(() => {
      const equipment: EquipmentOutput | null = this.equipment();
      if (!equipment) {
        return;
      }

      this.form.patchValue(
        {
          type: equipment.type,
          subType: equipment.subType ?? '',
          brand: equipment.brand ?? '',
          model: equipment.model ?? '',
          serialNumber: equipment.serialNumber ?? '',
          locationLabel: equipment.locationLabel ?? '',
        },
        { emitEvent: false },
      );
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
