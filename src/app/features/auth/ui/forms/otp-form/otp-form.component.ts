import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import {
  form,
  FormField,
  maxLength,
  pattern,
  required,
  type FieldTree,
} from '@angular/forms/signals';
import { BrnInputOtp } from '@spartan-ng/brain/input-otp';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldError, HlmFieldLabel } from '@shared/ui/field';
import {
  HlmInputOtp,
  HlmInputOtpGroup,
  HlmInputOtpSeparator,
  HlmInputOtpSlot,
} from '@shared/ui/input-otp';
import type { OtpFormValues } from './models';

/**
 * Constant OTP_PATTERN
 *
 * @description
 * The six digits every one-time code in this application is made of. Declared
 * here rather than in `constants/` because this form is its only consumer
 * (`ARCHITECTURE.md` §2.8).
 *
 * @since 1.0.0
 */
const OTP_PATTERN = /^\d{6}$/;

/**
 * Constant OTP_LENGTH
 *
 * @description
 * How many digits the input accepts, kept in step with {@link OTP_PATTERN}.
 *
 * @since 1.0.0
 */
const OTP_LENGTH = 6;

/**
 * Component OtpForm
 * @class OtpForm
 *
 * @description
 * The one-time-code form shared by every verification screen: registration,
 * MFA, and password reset. It owns the code and its rules; the page decides
 * what verifying means.
 *
 * The resend affordance is optional because it has no counterpart for an
 * authenticator app — a TOTP challenge is generated on the device, so there is
 * nothing to send again (`FEATURE.md`, auth).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-otp-form [pending]="isVerifying()" (submitted)="verify($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-otp-form',
  imports: [
    FormField,
    BrnInputOtp,
    HlmButton,
    HlmFieldError,
    HlmFieldLabel,
    HlmInputOtp,
    HlmInputOtpGroup,
    HlmInputOtpSeparator,
    HlmInputOtpSlot,
  ],
  templateUrl: './otp-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtpForm {
  //#region Inputs
  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether a verification attempt is in flight.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property showResend
   * @readonly
   *
   * @description
   * Whether the code can be sent again. False for an authenticator-app
   * challenge, which has no delivery to repeat.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly showResend: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property resending
   * @readonly
   *
   * @description
   * Whether a resend is in flight.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly resending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property length
   * @readonly
   *
   * @description
   * Slot count, bound to `brn-input-otp` so the rendered slots and the rules
   * cannot disagree.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {number}
   */
  protected readonly length: number = OTP_LENGTH;
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the code once it is well-formed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<OtpFormValues>}
   */
  public readonly submitted: OutputEmitterRef<OtpFormValues> = output<OtpFormValues>();

  /**
   * Property resent
   * @readonly
   *
   * @description
   * Emits when the operator asks for a new code.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly resent: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property model
   * @readonly
   *
   * @description
   * The edited code.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<OtpFormValues>}
   */
  protected readonly model: WritableSignal<OtpFormValues> = signal<OtpFormValues>({ code: '' });

  /**
   * Property otpForm
   * @readonly
   *
   * @description
   * The field tree and its rules. One `pattern` rule covers both length and
   * digits-only, so a five-digit entry and a six-letter one give the same
   * single message instead of two competing ones.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<OtpFormValues>}
   */
  protected readonly otpForm: FieldTree<OtpFormValues> = form(this.model, (path): void => {
    required(path.code, { message: $localize`:@@auth.otp.required:Enter the verification code` });
    // The rule is what puts `maxlength` on the input: Signal Forms owns that
    // attribute, and binding it in the template is rejected outright (NG8022).
    maxLength(path.code, OTP_LENGTH);
    pattern(path.code, OTP_PATTERN, {
      message: $localize`:@@auth.otp.pattern:The code is ${OTP_LENGTH}:length: digits`,
    });
  });
  //#endregion

  //#region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Marks the field touched so a failing rule becomes visible, then emits only
   * if the code is well-formed.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();

    this.otpForm().markAsTouched();

    if (this.otpForm().invalid()) return;

    this.submitted.emit(this.model());
  }

  /**
   * Method autoSubmit
   * @method autoSubmit
   *
   * @description
   * Verifies as soon as the last slot is filled. There is nothing left to
   * decide at that point — the code is either right or it is not — so making
   * the operator reach for a button after typing six digits only adds a step.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected autoSubmit(): void {
    this.otpForm().markAsTouched();

    if (this.otpForm().invalid()) return;

    this.submitted.emit(this.model());
  }
  //#endregion
}
