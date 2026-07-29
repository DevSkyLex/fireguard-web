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
  type FormGroup,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { toServerFieldErrors, toUnmatchedViolations, type ServerFieldErrors } from '@shared/utils';
import type { CreateOrganizationFormData, CreateOrganizationFormValues } from './models';

/**
 * Component CreateOrganizationForm
 * @class CreateOrganizationForm
 *
 * @description
 * Presentational form component for creating an organization during
 * onboarding. Emits typed form values via `submitted` output.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-create-organization-form',
  imports: [ReactiveFormsModule, InputTextModule, ButtonModule, MessageModule],
  templateUrl: './create-organization-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateOrganizationForm {
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
   * This is the very first step of onboarding, and the organization name derives a
   * slug that must be unique — a clash returns a 422 naming the field. Left as a
   * toast, a new user has no idea what to change.
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

  /**
   * Message of the first violation naming no field of this form.
   *
   * The API reports the clash on `slug` or `name` depending on the endpoint, and
   * this form only renders `organizationName` — so both land here rather than
   * disappearing.
   */
  protected readonly unmatchedViolation: Signal<string | null> = computed(
    () => toUnmatchedViolations(this.serverError(), ['organizationName'])[0]?.message ?? null,
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
   * @type {OutputEmitterRef<CreateOrganizationFormValues>}
   */
  public readonly submitted: OutputEmitterRef<CreateOrganizationFormValues> =
    output<CreateOrganizationFormValues>();
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
   * Reactive form group for organization creation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormGroup<CreateOrganizationFormData>}
   */
  protected readonly form: FormGroup<CreateOrganizationFormData> =
    this.formBuilder.group<CreateOrganizationFormData>({
      organizationName: this.formBuilder.control<string>('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(120),
      ]),
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
    if (this.form.invalid) return;
    const formValues: CreateOrganizationFormValues = this.form.getRawValue();
    this.submitted.emit(formValues);
  }
  //#endregion
}
