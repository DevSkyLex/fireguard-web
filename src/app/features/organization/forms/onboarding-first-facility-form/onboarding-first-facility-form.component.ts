import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
  type FormGroup,
  Validators,
} from '@angular/forms';
import type {
  FacilityTypeOption,
  OrganizationFacilityType,
} from '@core/models/organization';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import type { OnboardingFirstFacilityFormData } from './onboarding-first-facility-form-data.type';
import type { OnboardingFirstFacilityFormValues } from './onboarding-first-facility-form-values.type';

const DEFAULT_FACILITY_TYPE_OPTIONS: FacilityTypeOption[] = [
  { label: 'Site', value: 'site' },
  { label: 'Building', value: 'building' },
  { label: 'Floor', value: 'floor' },
  { label: 'Zone', value: 'zone' },
  { label: 'Area', value: 'area' },
];

/**
 * Component OnboardingFirstFacilityForm
 * @class OnboardingFirstFacilityForm
 *
 * @description
 * Presentational first facility onboarding form.
 *
 * @version 1.0.0
 */
@Component({
  selector: 'app-onboarding-first-facility-form',
  imports: [
    ReactiveFormsModule,
    SelectModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    MessageModule,
    ButtonModule,
  ],
  templateUrl: './onboarding-first-facility-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingFirstFacilityForm {
  //#region Properties
  /**
   * Property loading
   * @readonly
   *
   * @description
   * Loading state for submit action.
   *
   * @access public
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property facilityTypeOptions
   * @readonly
   *
   * @description
   * Facility type options loaded from API.
   * Falls back to local defaults when empty.
   *
   * @access public
   * @type {InputSignal<readonly FacilityTypeOption[]>}
   */
  public readonly facilityTypeOptions: InputSignal<readonly FacilityTypeOption[]> =
    input<readonly FacilityTypeOption[]>([]);

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits valid first facility form values.
   *
   * @access public
   * @type {OutputEmitterRef<OnboardingFirstFacilityFormValues>}
   */
  public readonly submitted: OutputEmitterRef<OnboardingFirstFacilityFormValues> =
    output<OnboardingFirstFacilityFormValues>();

  /**
   * Property resolvedFacilityTypeOptions
   * @readonly
   *
   * @description
   * Effective facility types displayed in the selector.
   * Uses API options when available, otherwise uses defaults.
   *
   * @access protected
   * @type {Signal<readonly FacilityTypeOption[]>}
   */
  protected readonly resolvedFacilityTypeOptions = computed<
    FacilityTypeOption[]
  >(() => {
    const options: readonly FacilityTypeOption[] = this.facilityTypeOptions();
    return options.length ? [...options] : [...DEFAULT_FACILITY_TYPE_OPTIONS];
  });

  /**
   * Property formBuilder
   * @readonly
   *
   * @description
   * Angular typed form builder.
   *
   * @access private
   * @type {NonNullableFormBuilder}
   */
  private readonly formBuilder: NonNullableFormBuilder =
    inject<NonNullableFormBuilder>(NonNullableFormBuilder);

  /**
   * Property form
   * @readonly
   *
   * @description
   * First facility onboarding form group.
   *
   * @access protected
   * @type {FormGroup<OnboardingFirstFacilityFormData>}
   */
  protected readonly form: FormGroup<OnboardingFirstFacilityFormData> =
    this.formBuilder.group<OnboardingFirstFacilityFormData>({
      type: this.formBuilder.control<OrganizationFacilityType>('site', [
        Validators.required,
      ]),
      name: this.formBuilder.control<string>('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(120),
      ]),
      code: this.formBuilder.control<string>('', [Validators.maxLength(80)]),
      address: this.formBuilder.control<string>('', [Validators.maxLength(255)]),
      country: this.formBuilder.control<string>('', [
        Validators.pattern(/^[a-zA-Z]{2}$/),
      ]),
      timezone: this.formBuilder.control<string>('', [Validators.maxLength(80)]),
    });
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Keeps selected facility type aligned with available options.
   */
  public constructor() {
    effect(() => {
      const options: readonly FacilityTypeOption[] =
        this.resolvedFacilityTypeOptions();
      const selectedFacilityType: OrganizationFacilityType =
        this.form.controls.type.value;
      const hasCurrentFacilityTypeOption: boolean = options.some(
        (option) => option.value === selectedFacilityType,
      );

      if (!hasCurrentFacilityTypeOption) {
        this.form.controls.type.setValue(options[0].value);
      }
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onSubmit
   *
   * @description
   * Emits form values when valid.
   */
  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitted.emit(this.form.getRawValue());
  }
  //#endregion
}
