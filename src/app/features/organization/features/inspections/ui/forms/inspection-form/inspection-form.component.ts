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
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
  type FormGroup,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import type { ChecklistOutput } from '@features/organization/features/checklists/models';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import type {
  InspectionResult,
  InspectionOutput,
  InspectorType,
} from '@features/organization/features/inspections/models';
import type { InspectionFormData, InspectionFormValues } from './models';
import { INSPECTION_RESULT_OPTIONS, INSPECTOR_TYPE_OPTIONS } from './options';

/**
 * Component InspectionForm
 * @class InspectionForm
 *
 * @description
 * Presentational form component for creating inspections.
 * Emits raw form values via `submitted` output. All store and API
 * interaction is handled by the parent page.
 *
 * Receives lists of available equipment, facilities and checklists
 * to populate the select dropdowns.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspection-form',
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    MessageModule,
    IconFieldModule,
    InputIconModule,
    SelectModule,
    TextareaModule,
    DatePickerModule,
  ],
  templateUrl: './inspection-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionForm {
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
   * Input equipments
   * @readonly
   *
   * @description
   * Available equipment for the equipment selector.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly EquipmentOutput[]>}
   */
  public readonly equipments: InputSignal<readonly EquipmentOutput[]> = input<
    readonly EquipmentOutput[]
  >([]);

  /**
   * Input facilities
   * @readonly
   *
   * @description
   * Available facilities for the facility selector.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly FacilityOutput[]>}
   */
  public readonly facilities: InputSignal<readonly FacilityOutput[]> = input<
    readonly FacilityOutput[]
  >([]);

  /**
   * Input checklists
   * @readonly
   *
   * @description
   * Available checklists for the checklist selector.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly ChecklistOutput[]>}
   */
  public readonly checklists: InputSignal<readonly ChecklistOutput[]> = input<
    readonly ChecklistOutput[]
  >([]);

  /** Existing inspection when the form is used in edit mode. */
  public readonly inspection: InputSignal<InspectionOutput | null> = input<InspectionOutput | null>(
    null,
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
   * @type {OutputEmitterRef<InspectionFormValues>}
   */
  public readonly submitted: OutputEmitterRef<InspectionFormValues> =
    output<InspectionFormValues>();

  /**
   * Output cancelled
   * @readonly
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
   * Reactive form group for inspection creation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormGroup<InspectionFormData>}
   */
  protected readonly form: FormGroup<InspectionFormData> =
    this.formBuilder.group<InspectionFormData>({
      equipmentId: this.formBuilder.control<string>('', [Validators.required]),
      result: this.formBuilder.control<InspectionResult>('pass', [Validators.required]),
      performedAt: new FormControl<Date | null>(new Date(), [Validators.required]),
      inspectorType: this.formBuilder.control<InspectorType>('user', [Validators.required]),
      inspectorName: this.formBuilder.control<string>('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(255),
      ]),
      facilityId: this.formBuilder.control<string>(''),
      checklistId: this.formBuilder.control<string>(''),
      notes: this.formBuilder.control<string>(''),
      signature: this.formBuilder.control<string>(''),
    });

  /**
   * Property resultOptions
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ label: string; value: InspectionResult }[]}
   */
  protected readonly resultOptions = INSPECTION_RESULT_OPTIONS;

  /**
   * Property inspectorTypeOptions
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ label: string; value: InspectorType }[]}
   */
  protected readonly inspectorTypeOptions = INSPECTOR_TYPE_OPTIONS;
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
      const inspection: InspectionOutput | null = this.inspection();
      if (!inspection) {
        return;
      }

      this.form.patchValue(
        {
          equipmentId: inspection.equipmentId,
          result: inspection.result,
          performedAt: new Date(inspection.performedAt),
          inspectorType: 'external',
          inspectorName: inspection.inspector?.displayName ?? 'Inspector',
          facilityId: inspection.facilityId ?? '',
          checklistId: inspection.checklistId ?? '',
          notes: inspection.notes ?? '',
          signature: inspection.signature ?? '',
        },
        { emitEvent: false },
      );
    });
  }
  //#endregion

  //#region Computed
  /**
   * Property equipmentOptions
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ label: string; value: string }[]}
   */
  protected get equipmentOptions(): { label: string; value: string }[] {
    return this.equipments().map((e: EquipmentOutput) => ({
      label: `${e.type}${e.brand ? ' — ' + e.brand : ''}${e.serialNumber ? ' (' + e.serialNumber + ')' : ''}`,
      value: e.id,
    }));
  }

  /**
   * Property facilityOptions
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ label: string; value: string }[]}
   */
  protected get facilityOptions(): { label: string; value: string }[] {
    return [
      { label: 'None', value: '' },
      ...this.facilities().map((f: FacilityOutput) => ({
        label: `${f.name}${f.code ? ' (' + f.code + ')' : ''}`,
        value: f.id,
      })),
    ];
  }

  /**
   * Property checklistOptions
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ label: string; value: string }[]}
   */
  protected get checklistOptions(): { label: string; value: string }[] {
    return [
      { label: 'None', value: '' },
      ...this.checklists().map((c: ChecklistOutput) => ({
        label: `${c.name} (v${c.version})`,
        value: c.id,
      })),
    ];
  }
  //#endregion

  //#region Methods
  /**
   * Method onSubmit
   * @method onSubmit
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onSubmit(): void {
    if (this.form.invalid) return;
    const formValues: InspectionFormValues = this.form.getRawValue();
    this.submitted.emit(formValues);
  }

  /**
   * Method onCancel
   * @method onCancel
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
