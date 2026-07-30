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
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  type FormGroup,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { toServerFieldErrors, toUnmatchedViolations, type ServerFieldErrors } from '@core/api';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
} from '@features/auth/constants';
import { MATCH_FIELDS_ERROR_KEY, matchFieldsValidator } from '@shared/match-fields';
import type { NewPasswordFormData, NewPasswordFormValues } from './models';

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
  imports: [ReactiveFormsModule, PasswordModule, ButtonModule, MessageModule],
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
   * Input serverError
   * @input
   *
   * @description
   * Last rejection from the parent page, as held by the store's call state.
   *
   * The API enforces the password policy authoritatively and reports a breach as a
   * 422 naming `newPassword`; projecting it onto the control tells the user which
   * rule failed instead of leaving them with a generic toast.
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
   * Message of the first violation that named no field in this form, surfaced at
   * form level rather than dropped.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly unmatchedViolation: Signal<string | null> = computed(
    () =>
      toUnmatchedViolations(this.serverError(), ['newPassword', 'confirmPassword'])[0]?.message ??
      null,
  );

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
          Validators.minLength(PASSWORD_MIN_LENGTH),
          Validators.maxLength(PASSWORD_MAX_LENGTH),
          Validators.pattern(PASSWORD_PATTERN),
        ]),
        confirmPassword: this.formBuilder.control<string>('', [Validators.required]),
      },
      {
        validators: matchFieldsValidator('newPassword', 'confirmPassword'),
      },
    );

  protected readonly matchFieldsErrorKey: string = MATCH_FIELDS_ERROR_KEY;

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

  //#region Constructor
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
