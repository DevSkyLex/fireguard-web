import {
  Component,
  ChangeDetectionStrategy,
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
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import type { LoginFormData, LoginFormValues } from './models';

/**
 * Component LoginForm
 * @class LoginForm
 *
 * @description
 * Presentational login form component.
 * Pure UI component that emits form values to parent.
 * No business logic, no store injection.
 *
 * @version 2.0.0
 *
 * @example
 * ```html
 * <app-login-form
 *   [loading]="loading()"
 *   (submitted)="handleLogin($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-login-form',
  imports: [
    ReactiveFormsModule,
    RouterModule,
    InputTextModule,
    PasswordModule,
    CheckboxModule,
    ButtonModule,
    MessageModule,
    IconFieldModule,
    InputIconModule,
  ],
  templateUrl: './login-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginForm {
  //#region Properties
  /**
   * Input loading
   * @input
   *
   * @description
   * Loading state from parent component.
   *
   * @access public
   * @since 2.0.0
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
   * Reactive form.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormGroup<LoginFormData>}
   */
  protected readonly form: FormGroup<LoginFormData> = this.formBuilder.group<LoginFormData>({
    email: this.formBuilder.control<string>('', [Validators.required, Validators.email]),
    password: this.formBuilder.control<string>('', [Validators.required]),
    remember_me: this.formBuilder.control<boolean>(false),
  });

  /**
   * Property submitted
   * @output
   * @readonly
   *
   * @description
   * Emitted when form is submitted (always emitted, regardless of autoLogin).
   * Useful for custom handling in modals or special cases.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<LoginFormValues>}
   */
  public readonly submitted: OutputEmitterRef<LoginFormValues> = output<LoginFormValues>();
  //#endregion

  //#region Methods
  /**
   * Method onSubmit
   *
   * @description
   * Submit form and emit values to parent.
   * Pure presentational logic only.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void} - None
   */
  protected onSubmit(): void {
    // If form is invalid, return
    if (this.form.invalid) return;

    // Get form values and emit to parent
    const formValues: LoginFormValues = this.form.getRawValue();
    this.submitted.emit(formValues);
  }
  //#endregion
}
