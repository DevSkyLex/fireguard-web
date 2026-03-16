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
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SelectModule } from 'primeng/select';
import type { FacilityOutput, FacilityType } from '@core/models/facility';
import type { FacilityFormData } from './facility-form-data.type';
import type { FacilityFormValues } from './facility-form-values.type';

/**
 * Component FacilityForm
 * @class FacilityForm
 *
 * @description
 * Presentational form component for creating and editing facilities.
 * Emits raw form values via `submitted` output. All store and API
 * interaction is handled by the parent page.
 *
 * When `facility` is provided, the form operates in edit mode and
 * pre-fills the fields. The `type` field is disabled in edit mode
 * since facility type cannot be changed after creation.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-form',
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    MessageModule,
    IconFieldModule,
    InputIconModule,
    SelectModule,
  ],
  templateUrl: './facility-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityForm {
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
   * Input facility
   * @readonly
   *
   * @description
   * Existing facility to edit. When provided, the form enters
   * edit mode and pre-fills the fields. When null, the form
   * operates in create mode.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<FacilityOutput | null>}
   */
  public readonly facility: InputSignal<FacilityOutput | null> = input<FacilityOutput | null>(null);

  /**
   * Input parentFacilities
   * @readonly
   *
   * @description
   * Available facilities that can be used as a parent. Used in
   * create mode to populate the parent facility select dropdown.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly FacilityOutput[]>}
   */
  public readonly parentFacilities: InputSignal<readonly FacilityOutput[]> = input<readonly FacilityOutput[]>([]);
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
   * @type {OutputEmitterRef<FacilityFormValues>}
   */
  public readonly submitted: OutputEmitterRef<FacilityFormValues> =
    output<FacilityFormValues>();

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
   * Reactive form group for facility creation and editing.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormGroup<FacilityFormData>}
   */
  protected readonly form: FormGroup<FacilityFormData> =
    this.formBuilder.group<FacilityFormData>({
      type: this.formBuilder.control<FacilityType>('site', [Validators.required]),
      name: this.formBuilder.control<string>('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(255),
      ]),
      code: this.formBuilder.control<string>(''),
      address: this.formBuilder.control<string>(''),
      parentFacilityId: this.formBuilder.control<string>(''),
    });

  /**
   * Property typeOptions
   * @readonly
   *
   * @description
   * Available facility type options for the select dropdown.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ label: string; value: FacilityType }[]}
   */
  protected readonly typeOptions: { label: string; value: FacilityType }[] = [
    { label: 'Site', value: 'site' },
    { label: 'Building', value: 'building' },
    { label: 'Floor', value: 'floor' },
    { label: 'Zone', value: 'zone' },
    { label: 'Area', value: 'area' },
  ];

  /**
   * Property parentOptions
   * @readonly
   *
   * @description
   * Options for the parent facility select dropdown. Includes a
   * "None" option (root level) plus all available parent facilities.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {{ label: string; value: string }[]}
   */
  protected get parentOptions(): { label: string; value: string }[] {
    return [
      { label: 'None (root level)', value: '' },
      ...this.parentFacilities().map((f: FacilityOutput) => ({
        label: `${f.name}${f.code ? ' (' + f.code + ')' : ''}`,
        value: f.id,
      })),
    ];
  }

  /**
   * Property isEditMode
   *
   * @description
   * Whether the form is in edit mode (facility input is provided).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {boolean}
   */
  protected get isEditMode(): boolean {
    return this.facility() !== null;
  }
  //#endregion

  //#region Constructor
  public constructor() {
    effect(() => {
      if (this.loading()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
        if (this.isEditMode) {
          this.form.controls.type.disable({ emitEvent: false });
        }
      }
    });
  }
  //#endregion

  //#region Lifecycle
  /**
   * Method ngOnInit
   *
   * @description
   * Pre-fills the form with existing facility data when in edit mode.
   *
   * @since 1.0.0
   */
  public ngOnInit(): void {
    const facility: FacilityOutput | null = this.facility();
    if (facility) {
      this.form.patchValue({
        type: facility.type,
        name: facility.name,
        code: facility.code ?? '',
        address: facility.address ?? '',
        parentFacilityId: facility.parentFacilityId ?? '',
      });
      // Type cannot be changed after creation
      this.form.controls.type.disable();
    }
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
    const formValues: FacilityFormValues = this.form.getRawValue();
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
