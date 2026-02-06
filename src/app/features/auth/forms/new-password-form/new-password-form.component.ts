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
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import type { NewPasswordFormData } from './new-password-form-data.type';
import type { NewPasswordFormValues } from './new-password-form-values.type';

/**
 * Component NewPasswordForm
 * @class NewPasswordForm
 *
 * @description
 * Presentational new password form component.
 * Pure UI component that emits form values to parent.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-new-password-form',
  imports: [
    ReactiveFormsModule,
    PasswordModule,
    ButtonModule,
    MessageModule,
    IconFieldModule,
    InputIconModule,
  ],
  templateUrl: './new-password-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewPasswordForm {
  //#region Properties
  /**
   * Input loading
   * @input
   *
   * @description
   * Loading state from parent component.
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
   * Reactive form.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormGroup<NewPasswordFormData>}
   */
  protected readonly form: FormGroup<NewPasswordFormData> =
    this.formBuilder.group<NewPasswordFormData>(
      {
        newPassword: this.formBuilder.control<string>('', [
          Validators.required,
          Validators.minLength(8),
        ]),
        confirmPassword: this.formBuilder.control<string>('', [
          Validators.required,
        ]),
      },
      {
        validators: this.passwordMatchValidator,
      }
    );

  /**
   * Property submitted
   * @output
   * @readonly
   *
   * @description
   * Emitted when form is submitted.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<NewPasswordFormValues>}
   */
  public readonly submitted: OutputEmitterRef<NewPasswordFormValues> =
    output<NewPasswordFormValues>();

  /**
   * Property cancelled
   * @output
   * @readonly
   *
   * @description
   * Emitted when user cancels.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Methods
  /**
   * Method passwordMatchValidator
   *
   * @description
   * Validates that password and confirmPassword match.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {AbstractControl} control - Form group control.
   *
   * @returns {ValidationErrors | null}
   */
  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }

    return null;
  }

  /**
   * Method onSubmit
   *
   * @description
   * Submit form and emit values to parent.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onSubmit(): void {
    if (this.form.invalid) return;

    const formValues: NewPasswordFormValues = {
      newPassword: this.form.controls.newPassword.value,
    };
    this.submitted.emit(formValues);
  }

  /**
   * Method onCancel
   *
   * @description
   * Cancel and emit to parent.
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
