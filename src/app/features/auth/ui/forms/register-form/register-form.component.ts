import {
  Component,
  ChangeDetectionStrategy,
  effect,
  inject,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  untracked,
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
import { PasswordModule } from 'primeng/password';
import { toServerFieldErrors, toUnmatchedViolations, type ServerFieldErrors } from '@core/api';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
} from '@features/auth/constants';
import { MATCH_FIELDS_ERROR_KEY, matchFieldsValidator } from '@shared/match-fields';
import type { RegisterFormData, RegisterFormValues } from './models';

/**
 * Component RegisterForm
 * @class RegisterForm
 *
 * @description
 * Presentational registration form (first name, last name, email, password).
 * Pure UI component that emits form values to its parent page. No store
 * injection, no navigation, no API calls.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-register-form [loading]="loading()" (submitted)="handleRegister($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-register-form',
  imports: [ReactiveFormsModule, InputTextModule, PasswordModule, ButtonModule, MessageModule],
  templateUrl: './register-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterForm {
  //#region Properties
  /**
   * Input loading
   * @input
   *
   * @description
   * Loading state from the parent page.
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
   * A 422 carries per-field violations; they are projected onto the matching
   * controls so the user sees which field the server refused instead of a generic
   * toast. Anything else is ignored here and stays the page's business.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);

  /**
   * Property serverFieldErrors
   * @readonly
   *
   * @description
   * Server message per field, projected from the last 422.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<ServerFieldErrors>}
   */
  protected readonly serverFieldErrors: Signal<ServerFieldErrors> = computed(() =>
    toServerFieldErrors(this.serverError()),
  );

  /**
   * Property unmatchedViolation
   * @readonly
   *
   * @description
   * Message of the first violation that named no field in this form, so it can be
   * shown at form level rather than silently dropped.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly unmatchedViolation: Signal<string | null> = computed(
    () =>
      toUnmatchedViolations(this.serverError(), [
        'firstName',
        'lastName',
        'email',
        'password',
        'confirmPassword',
      ])[0]?.message ?? null,
  );

  /**
   * Input email
   * @input
   *
   * @description
   * Address the account is being created for, when the caller already knows it
   * — an invitation names its recipient, and making them retype it only invites
   * a typo that breaks the match.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly email: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property formBuilder
   * @readonly
   *
   * @description
   * Reactive form builder.
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
   * Reactive registration form.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormGroup<RegisterFormData>}
   */
  protected readonly form: FormGroup<RegisterFormData> = this.formBuilder.group<RegisterFormData>(
    {
      firstName: this.formBuilder.control<string>('', [
        Validators.required,
        Validators.maxLength(100),
      ]),
      lastName: this.formBuilder.control<string>('', [
        Validators.required,
        Validators.maxLength(100),
      ]),
      email: this.formBuilder.control<string>('', [Validators.required, Validators.email]),
      password: this.formBuilder.control<string>('', [
        Validators.required,
        Validators.minLength(PASSWORD_MIN_LENGTH),
        Validators.maxLength(PASSWORD_MAX_LENGTH),
        Validators.pattern(PASSWORD_PATTERN),
      ]),
      confirmPassword: this.formBuilder.control<string>('', [Validators.required]),
    },
    {
      validators: matchFieldsValidator('password', 'confirmPassword'),
    },
  );

  /**
   * Property matchFieldsErrorKey
   * @readonly
   *
   * @description
   * Group-level error key set when the password and confirmation differ.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly matchFieldsErrorKey: string = MATCH_FIELDS_ERROR_KEY;

  /**
   * Property submitted
   * @output
   * @readonly
   *
   * @description
   * Emitted when the form is submitted with valid values. The confirmation field
   * is dropped — only the {@link RegisterFormValues} payload is emitted.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<RegisterFormValues>}
   */
  public readonly submitted: OutputEmitterRef<RegisterFormValues> = output<RegisterFormValues>();
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Seeds the email control from a routed address, and disables the form while
   * a submission is in flight.
   *
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const email: string | null = this.email();

      if (email === null || email === '') return;

      untracked((): void => this.form.controls.email.setValue(email));
    });

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
   *
   * @description
   * Validates and emits the form values to the parent page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onSubmit(): void {
    if (this.form.invalid) return;

    const { firstName, lastName, email, password } = this.form.getRawValue();
    const formValues: RegisterFormValues = { firstName, lastName, email, password };
    this.submitted.emit(formValues);
  }
  //#endregion
}
