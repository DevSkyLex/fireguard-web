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
import { HlmFieldImports } from '@shared/ui/field';
import {
  HlmInputOtp,
  HlmInputOtpGroup,
  HlmInputOtpSeparator,
  HlmInputOtpSlot,
} from '@shared/ui/input-otp';
import type { AccountOtpCodeFormValues } from './models';

/**
 * Constant OTP_PATTERN
 *
 * @description
 * The six digits an authenticator app produces.
 *
 * @since 1.0.0
 */
const OTP_PATTERN = /^\d{6}$/;

/**
 * Constant OTP_LENGTH
 *
 * @description
 * Slot count, kept in step with {@link OTP_PATTERN}.
 *
 * @since 1.0.0
 */
const OTP_LENGTH = 6;

/**
 * Component AccountOtpCodeForm
 * @class AccountOtpCodeForm
 *
 * @description
 * A six-digit authenticator code, asked for twice in the security section:
 * once to activate an enrollment and once to prove possession before disabling
 * it. Account-local rather than reused from auth, because auth's version is
 * shaped around a delivered challenge it can resend — a TOTP code is generated
 * on the device and has no delivery to repeat.
 *
 * {@link inputId} is required precisely because both instances can be on screen
 * at once; a shared id would break the label association of whichever rendered
 * second.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-account-otp-code-form inputId="totp-confirm" [pending]="isConfirming()" (submitted)="confirm($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-account-otp-code-form',
  imports: [
    FormField,
    BrnInputOtp,
    HlmButton,
    HlmInputOtp,
    HlmInputOtpGroup,
    HlmInputOtpSeparator,
    HlmInputOtpSlot,
    ...HlmFieldImports,
  ],
  templateUrl: './account-otp-code-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountOtpCodeForm {
  //#region Inputs
  /**
   * Property inputId
   * @readonly
   *
   * @description
   * DOM id of the underlying input, which the caller's label points at.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly inputId: InputSignal<string> = input.required<string>();

  /**
   * Property submitLabel
   * @readonly
   *
   * @description
   * What the confirm control says. Supplied by the caller because the same
   * field means "activate" in one place and "disable" in the other.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly submitLabel: InputSignal<string> = input.required<string>();

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether the code is being checked.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property destructive
   * @readonly
   *
   * @description
   * Whether the confirm control should read as destructive, which it is when
   * the code is proving the right to switch two-factor off.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly destructive: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the code once it is six digits.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly submitted: OutputEmitterRef<string> = output<string>();

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * Emits when the user backs out of the step.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
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
   * @type {WritableSignal<AccountOtpCodeFormValues>}
   */
  protected readonly model: WritableSignal<AccountOtpCodeFormValues> =
    signal<AccountOtpCodeFormValues>({ code: '' });

  /**
   * Property codeForm
   * @readonly
   *
   * @description
   * The field tree and its rules. One `pattern` rule covers both length and
   * digits-only, so a short entry and a non-numeric one give the same single
   * message rather than two competing ones.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<AccountOtpCodeFormValues>}
   */
  protected readonly codeForm: FieldTree<AccountOtpCodeFormValues> = form(
    this.model,
    (path): void => {
      required(path.code, {
        message: $localize`:@@account.otp.required:Enter the code from your authenticator app`,
      });
      // The rule is what puts `maxlength` on the input: Signal Forms owns that
      // attribute, and binding it in the template is rejected outright (NG8022).
      maxLength(path.code, OTP_LENGTH);
      pattern(path.code, OTP_PATTERN, {
        message: $localize`:@@account.otp.pattern:The code is ${OTP_LENGTH}:length: digits`,
      });
    },
  );
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
   * @param {Event} event - The native submit event.
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();

    this.emitWhenValid();
  }

  /**
   * Method autoSubmit
   * @method autoSubmit
   *
   * @description
   * Submits as soon as the sixth slot is filled. A TOTP code expires in
   * seconds, so making the user reach for a button after typing it only burns
   * the window it is valid for.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected autoSubmit(): void {
    this.emitWhenValid();
  }

  /**
   * Method reset
   * @method reset
   *
   * @description
   * Clears the field so a rejected code does not have to be deleted digit by
   * digit before the next attempt. Called by the parent, which is the only
   * thing that learns the code was wrong.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public reset(): void {
    this.model.set({ code: '' });
    this.codeForm().reset();
  }

  /**
   * Method emitWhenValid
   * @method emitWhenValid
   *
   * @description
   * Shared tail of the two submit paths.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {void}
   */
  private emitWhenValid(): void {
    this.codeForm().markAsTouched();

    if (this.codeForm().invalid()) return;

    this.submitted.emit(this.model().code);
  }
  //#endregion
}
