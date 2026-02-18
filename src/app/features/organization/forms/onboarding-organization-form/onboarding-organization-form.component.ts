import {
  ChangeDetectionStrategy,
  Component,
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
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import type { OnboardingOrganizationFormData } from './onboarding-organization-form-data.type';
import type { OnboardingOrganizationFormValues } from './onboarding-organization-form-values.type';

/**
 * Component OnboardingOrganizationForm
 * @class OnboardingOrganizationForm
 *
 * @description
 * Presentational organization onboarding form.
 *
 * @version 1.0.0
 */
@Component({
  selector: 'app-onboarding-organization-form',
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    MessageModule,
    ButtonModule,
  ],
  templateUrl: './onboarding-organization-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingOrganizationForm {
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
   * Property submitted
   * @readonly
   *
   * @description
   * Emits valid organization form values.
   *
   * @access public
   * @type {OutputEmitterRef<OnboardingOrganizationFormValues>}
   */
  public readonly submitted: OutputEmitterRef<OnboardingOrganizationFormValues> =
    output<OnboardingOrganizationFormValues>();

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
   * Organization onboarding form group.
   *
   * @access protected
   * @type {FormGroup<OnboardingOrganizationFormData>}
   */
  protected readonly form: FormGroup<OnboardingOrganizationFormData> =
    this.formBuilder.group<OnboardingOrganizationFormData>({
      name: this.formBuilder.control<string>('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(120),
      ]),
      slug: this.formBuilder.control<string>('', [
        Validators.minLength(3),
        Validators.maxLength(120),
        Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      ]),
    });
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
