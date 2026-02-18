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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  type FormGroup,
  Validators,
} from '@angular/forms';
import { startWith } from 'rxjs';
import type {
  OrganizationLegalProfileRequirements,
  OrganizationLegalType,
  OrganizationLegalTypeOption,
} from '@core/models/organization';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import type { OnboardingLegalProfileFormData } from './onboarding-legal-profile-form-data.type';
import type { OnboardingLegalProfileFormValues } from './onboarding-legal-profile-form-values.type';

const DEFAULT_LEGAL_PROFILE_REQUIREMENTS: OrganizationLegalProfileRequirements = {
  registrationNumber: { required: false },
  vatNumber: { required: false },
};

const DEFAULT_LEGAL_TYPE_OPTIONS: OrganizationLegalTypeOption[] = [
  {
    label: 'Company',
    value: 'company',
    requirements: {
      registrationNumber: { required: true },
      vatNumber: { required: false },
    },
  },
  {
    label: 'Non-profit',
    value: 'non_profit',
    requirements: {
      registrationNumber: { required: true },
      vatNumber: { required: false },
    },
  },
  {
    label: 'Public sector',
    value: 'public_sector',
    requirements: {
      registrationNumber: { required: false },
      vatNumber: { required: false },
    },
  },
  {
    label: 'Individual',
    value: 'individual',
    requirements: {
      registrationNumber: { required: false },
      vatNumber: { required: false },
    },
  },
  {
    label: 'Other',
    value: 'other',
    requirements: {
      registrationNumber: { required: false },
      vatNumber: { required: false },
    },
  },
];

const LEGAL_IDENTIFIER_PATTERN: RegExp = /^[A-Za-z0-9\-/. ]+$/;

/**
 * Component OnboardingLegalProfileForm
 * @class OnboardingLegalProfileForm
 *
 * @description
 * Presentational legal profile onboarding form.
 *
 * @version 1.0.0
 */
@Component({
  selector: 'app-onboarding-legal-profile-form',
  imports: [
    ReactiveFormsModule,
    SelectModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    MessageModule,
    ButtonModule,
  ],
  templateUrl: './onboarding-legal-profile-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingLegalProfileForm {
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
   * Property legalTypeOptions
   * @readonly
   *
   * @description
   * Legal type options loaded from API.
   * Falls back to local defaults when empty.
   *
   * @access public
   * @type {InputSignal<readonly OrganizationLegalTypeOption[]>}
   */
  public readonly legalTypeOptions: InputSignal<
    readonly OrganizationLegalTypeOption[]
  > = input<readonly OrganizationLegalTypeOption[]>([]);

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits valid legal profile form values.
   *
   * @access public
   * @type {OutputEmitterRef<OnboardingLegalProfileFormValues>}
   */
  public readonly submitted: OutputEmitterRef<OnboardingLegalProfileFormValues> =
    output<OnboardingLegalProfileFormValues>();

  /**
   * Property resolvedLegalTypeOptions
   * @readonly
   *
   * @description
   * Effective legal types displayed in the selector.
   * Uses API options when available, otherwise uses defaults.
   *
   * @access protected
   * @type {Signal<readonly OrganizationLegalTypeOption[]>}
   */
  protected readonly resolvedLegalTypeOptions = computed<
    OrganizationLegalTypeOption[]
  >(() => {
    const options: readonly OrganizationLegalTypeOption[] = this.legalTypeOptions();
    return options.length ? [...options] : [...DEFAULT_LEGAL_TYPE_OPTIONS];
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
   * Legal profile onboarding form group.
   *
   * @access protected
   * @type {FormGroup<OnboardingLegalProfileFormData>}
   */
  protected readonly form: FormGroup<OnboardingLegalProfileFormData> =
    this.formBuilder.group<OnboardingLegalProfileFormData>({
      legalType: this.formBuilder.control<OrganizationLegalType>('company', [
        Validators.required,
      ]),
      legalName: this.formBuilder.control<string>('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(160),
      ]),
      registrationNumber: this.formBuilder.control<string>('', [
        Validators.maxLength(64),
        Validators.pattern(LEGAL_IDENTIFIER_PATTERN),
      ]),
      vatNumber: this.formBuilder.control<string>('', [
        Validators.maxLength(64),
        Validators.pattern(LEGAL_IDENTIFIER_PATTERN),
      ]),
    });
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Synchronizes registration number validation with selected legal type.
   */
  public constructor() {
    this.form.controls.legalType.valueChanges
      .pipe(
        startWith(this.form.controls.legalType.value),
        takeUntilDestroyed(),
      )
      .subscribe((legalType) => {
        this.updateConditionalValidators(legalType);
      });

    effect(() => {
      const options: readonly OrganizationLegalTypeOption[] =
        this.resolvedLegalTypeOptions();
      const selectedLegalType: OrganizationLegalType =
        this.form.controls.legalType.value;
      const hasCurrentLegalTypeOption: boolean = options.some(
        (option) => option.value === selectedLegalType,
      );

      if (!hasCurrentLegalTypeOption) {
        this.form.controls.legalType.setValue(options[0].value);
        return;
      }

      this.updateConditionalValidators(selectedLegalType);
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method isRegistrationNumberRequired
   *
   * @description
   * Indicates if registration number is required for the selected legal type.
   *
   * @returns {boolean}
   */
  protected isRegistrationNumberRequired(): boolean {
    return this.getRequirementsForLegalType(this.form.controls.legalType.value)
      .registrationNumber.required;
  }

  /**
   * Method isVatNumberRequired
   *
   * @description
   * Indicates if VAT number is required for the selected legal type.
   *
   * @returns {boolean}
   */
  protected isVatNumberRequired(): boolean {
    return this.getRequirementsForLegalType(this.form.controls.legalType.value)
      .vatNumber.required;
  }

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

  /**
   * Method getRequirementsForLegalType
   *
   * @description
   * Returns requirements for the selected legal type.
   *
   * @param {OrganizationLegalType} legalType - Current legal type.
   *
   * @returns {OrganizationLegalProfileRequirements}
   */
  private getRequirementsForLegalType(
    legalType: OrganizationLegalType,
  ): OrganizationLegalProfileRequirements {
    const option: OrganizationLegalTypeOption | undefined =
      this.resolvedLegalTypeOptions().find(
        (candidate) => candidate.value === legalType,
      );
    return option?.requirements ?? DEFAULT_LEGAL_PROFILE_REQUIREMENTS;
  }

  /**
   * Method updateConditionalValidators
   *
   * @description
   * Updates registration/VAT validators based on selected legal type requirements.
   *
   * @param {OrganizationLegalType} legalType - Current legal type.
   */
  private updateConditionalValidators(legalType: OrganizationLegalType): void {
    const requirements: OrganizationLegalProfileRequirements =
      this.getRequirementsForLegalType(legalType);

    const registrationNumberValidators = [
      Validators.maxLength(64),
      Validators.pattern(LEGAL_IDENTIFIER_PATTERN),
    ];
    if (requirements.registrationNumber.required) {
      registrationNumberValidators.unshift(Validators.required);
    }

    const vatNumberValidators = [
      Validators.maxLength(64),
      Validators.pattern(LEGAL_IDENTIFIER_PATTERN),
    ];
    if (requirements.vatNumber.required) {
      vatNumberValidators.unshift(Validators.required);
    }

    this.form.controls.registrationNumber.setValidators(
      registrationNumberValidators,
    );
    this.form.controls.registrationNumber.updateValueAndValidity({
      emitEvent: false,
    });

    this.form.controls.vatNumber.setValidators(vatNumberValidators);
    this.form.controls.vatNumber.updateValueAndValidity({
      emitEvent: false,
    });
  }
  //#endregion
}
