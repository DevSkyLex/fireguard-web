import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputOtpModule } from 'primeng/inputotp';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import type { AccountPasswordChangeStep } from '@features/account/state';
import { MATCH_FIELDS_ERROR_KEY, matchFieldsValidator } from '@shared/validators';
import type {
  AccountPasswordConfirmFormData,
  AccountPasswordRequestFormData,
  PasswordChangeConfirmation,
} from './models';

/**
 * Constant PASSWORD_PATTERN
 * @const PASSWORD_PATTERN
 *
 * @description
 * Password complexity pattern enforced by the backend: lowercase,
 * uppercase, digit and special character.
 *
 * @since 1.0.0
 */
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#].*$/;

/**
 * Component AccountPasswordForm
 * @class AccountPasswordForm
 *
 * @description
 * Presentational two-step password change form. Step one verifies the
 * current password (which triggers a one-time code by email); step two
 * collects the code and the new password. Emits user intents without
 * depending on account stores.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-account-password-form
 *   [step]="passwordStore.step()"
 *   [requesting]="passwordStore.isRequesting()"
 *   [confirming]="passwordStore.isConfirming()"
 *   [hasRequestError]="passwordStore.requestError() !== null"
 *   [hasConfirmError]="passwordStore.confirmError() !== null"
 *   [maskedRecipient]="passwordStore.maskedRecipient()"
 *   (requested)="requestPasswordChange($event)"
 *   (confirmed)="confirmPasswordChange($event)"
 *   (cancelled)="restartPasswordChange()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-password-form',
  imports: [ReactiveFormsModule, ButtonModule, InputOtpModule, MessageModule, PasswordModule],
  templateUrl: './account-password-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPasswordForm {
  //#region Properties
  /**
   * Input step
   * @input
   *
   * @description
   * Active step of the password change workflow.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<AccountPasswordChangeStep>}
   */
  public readonly step: InputSignal<AccountPasswordChangeStep> =
    input<AccountPasswordChangeStep>('request');

  /**
   * Input requesting
   * @input
   *
   * @description
   * Whether the password change request is in progress.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly requesting: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input confirming
   * @input
   *
   * @description
   * Whether the password change confirmation is in progress.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly confirming: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input hasRequestError
   * @input
   *
   * @description
   * Whether the latest password change request failed (e.g. wrong
   * current password).
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly hasRequestError: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input hasConfirmError
   * @input
   *
   * @description
   * Whether the latest password change confirmation failed (invalid or
   * expired code, attempts exhausted).
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly hasConfirmError: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input maskedRecipient
   * @input
   *
   * @description
   * Masked email address the one-time code was sent to.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly maskedRecipient: InputSignal<string | null> = input<string | null>(null);

  /**
   * Output requested
   * @output
   *
   * @description
   * Emits the current password when the request step is submitted.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly requested: OutputEmitterRef<string> = output<string>();

  /**
   * Output confirmed
   * @output
   *
   * @description
   * Emits the one-time code and new password when the confirm step is
   * submitted.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<PasswordChangeConfirmation>}
   */
  public readonly confirmed: OutputEmitterRef<PasswordChangeConfirmation> =
    output<PasswordChangeConfirmation>();

  /**
   * Output cancelled
   * @output
   *
   * @description
   * Emits when the user abandons the verify step to start over.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();

  /**
   * Property formBuilder
   * @readonly
   *
   * @description
   * Non-nullable form builder used to preserve strict control value types.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {NonNullableFormBuilder}
   */
  private readonly formBuilder: NonNullableFormBuilder =
    inject<NonNullableFormBuilder>(NonNullableFormBuilder);

  /**
   * Property requestForm
   * @readonly
   *
   * @description
   * Form of the request step (current password).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormGroup<AccountPasswordRequestFormData>}
   */
  protected readonly requestForm: FormGroup<AccountPasswordRequestFormData> =
    this.formBuilder.group<AccountPasswordRequestFormData>({
      currentPassword: this.formBuilder.control('', [Validators.required]),
    });

  /**
   * Property confirmForm
   * @readonly
   *
   * @description
   * Form of the confirm step (one-time code and new password).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormGroup<AccountPasswordConfirmFormData>}
   */
  protected readonly confirmForm: FormGroup<AccountPasswordConfirmFormData> =
    this.formBuilder.group<AccountPasswordConfirmFormData>(
      {
        code: this.formBuilder.control('', [
          Validators.required,
          Validators.minLength(6),
          Validators.maxLength(6),
        ]),
        newPassword: this.formBuilder.control('', [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(128),
          Validators.pattern(PASSWORD_PATTERN),
        ]),
        confirmPassword: this.formBuilder.control('', [Validators.required]),
      },
      {
        validators: matchFieldsValidator('newPassword', 'confirmPassword'),
      },
    );

  /**
   * Property matchFieldsErrorKey
   * @readonly
   *
   * @description
   * Error key produced by the match-fields validator.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly matchFieldsErrorKey: string = MATCH_FIELDS_ERROR_KEY;

  /**
   * Property expanded
   * @readonly
   *
   * @description
   * Whether the request step shows the full form. Collapsed by default so
   * the rarely-used password change stays a single quiet action until the
   * user opts in (progressive disclosure).
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly expanded: WritableSignal<boolean> = signal<boolean>(false);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Clears step forms whenever the workflow step changes and mirrors the
   * pending states onto the form controls.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      this.step();
      this.requestForm.reset({}, { emitEvent: false });
      this.confirmForm.reset({}, { emitEvent: false });
    });
    effect((): void =>
      this.requesting()
        ? this.requestForm.disable({ emitEvent: false })
        : this.requestForm.enable({ emitEvent: false }),
    );
    effect((): void =>
      this.confirming()
        ? this.confirmForm.disable({ emitEvent: false })
        : this.confirmForm.enable({ emitEvent: false }),
    );
  }
  //#endregion

  //#region Methods
  /**
   * Method submitRequest
   * @method submitRequest
   *
   * @description
   * Marks invalid controls as touched or emits the current password.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected submitRequest(): void {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }
    this.requested.emit(this.requestForm.getRawValue().currentPassword);
  }

  /**
   * Method submitConfirm
   * @method submitConfirm
   *
   * @description
   * Marks invalid controls as touched or emits the one-time code and the
   * new password.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected submitConfirm(): void {
    if (this.confirmForm.invalid) {
      this.confirmForm.markAllAsTouched();
      return;
    }
    const { code, newPassword } = this.confirmForm.getRawValue();
    this.confirmed.emit({ code, newPassword });
  }

  /**
   * Method collapse
   * @method collapse
   *
   * @description
   * Clears the request form and returns to the collapsed single-action
   * state without leaving the request step.
   *
   * @access protected
   * @since 1.1.0
   *
   * @returns {void}
   */
  protected collapse(): void {
    this.requestForm.reset({}, { emitEvent: false });
    this.expanded.set(false);
  }
  //#endregion
}
