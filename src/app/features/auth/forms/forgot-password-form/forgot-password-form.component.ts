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
import { RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import type { ForgotPasswordFormData } from './forgot-password-form-data.type';
import type { ForgotPasswordFormValues } from './forgot-password-form-values.type';

/**
 * Component ForgotPasswordForm
 * @class ForgotPasswordForm
 *
 * @description
 * Presentational forgot password form component.
 * Pure UI component that emits form values to parent.
 *
 * @version 3.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-forgot-password-form',
  imports: [
    ReactiveFormsModule,
    RouterModule,
    InputTextModule,
    ButtonModule,
    MessageModule,
    IconFieldModule,
    InputIconModule,
  ],
  templateUrl: './forgot-password-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordForm {
  //#region Properties
  /**
   * Input loading
   * @input
   *
   * @description
   * Loading state from parent component.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> =
    input<boolean>(false);

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
   * @type {FormGroup<ForgotPasswordFormData>}
   */
  protected readonly form: FormGroup<ForgotPasswordFormData> =
    this.formBuilder.group<ForgotPasswordFormData>({
      email: this.formBuilder.control<string>('', [
        Validators.required,
        Validators.email,
      ]),
    });

  private readonly disableFormEffect = effect(() => {
    this.loading() ? this.form.disable() : this.form.enable();
  });

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
   * @type {OutputEmitterRef<ForgotPasswordFormValues>}
   */
  public readonly submitted: OutputEmitterRef<ForgotPasswordFormValues> =
    output<ForgotPasswordFormValues>();
  //#endregion

  //#region Methods
  /**
   * Method onSubmit
   *
   * @description
   * Submit form and emit values to parent.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected onSubmit(): void {
    if (this.form.invalid) return;

    const formValues: ForgotPasswordFormValues = this.form.getRawValue();
    this.submitted.emit(formValues);
  }
  //#endregion
}
