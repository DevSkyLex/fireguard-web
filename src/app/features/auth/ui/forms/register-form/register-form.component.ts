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
  type FormGroup,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { MATCH_FIELDS_ERROR_KEY, matchFieldsValidator } from '@shared/validators';
import type { RegisterFormData, RegisterFormValues } from './models';

/**
 * Constant PASSWORD_PATTERN
 *
 * @description
 * Mirrors the backend password policy: at least one lowercase, one uppercase,
 * one digit, and one special character.
 *
 * @since 1.0.0
 */
const PASSWORD_PATTERN: RegExp =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/;

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
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    MessageModule,
    IconFieldModule,
    InputIconModule,
  ],
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
        Validators.minLength(8),
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
   * Disables the form while a submission is in flight.
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
