import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
  untracked,
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
import type { StoreError } from '@core/request-state';
import { RequiredMarker } from '@shared/required-marker';
import { HlmButton } from '@shared/ui/button';
import { HlmCheckbox } from '@shared/ui/checkbox';
import { HlmFieldImports } from '@shared/ui/field';
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
 * nothing to send again (`FEATURE.md`, auth). The "trust this device" control
 * is opt-in the same way: only the MFA screen has a session to bind a device
 * to, so registration and password-reset verification never show it.
 *
 * The field, the slots and the error are laid out by `hlm-field` alone — no
 * `items-center`, no manual `aria-invalid`, no gated `@if` around the error —
 * so the six slots stretch to the column and the brain's own invalid state
 * drives the error line, as the onboarding forms already do.
 *
 * `brn-input-otp` binds `[formField]` natively, with no compatibility layer:
 * it owns the real input behind the slots, which is what carries
 * `autocomplete="one-time-code"` and the numeric keypad on a phone.
 *
 * @version 1.2.0
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
    RequiredMarker,
    FormField,
    BrnInputOtp,
    HlmButton,
    HlmCheckbox,
    HlmInputOtp,
    HlmInputOtpGroup,
    HlmInputOtpSeparator,
    HlmInputOtpSlot,
    ...HlmFieldImports,
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
   * Property showTrustDevice
   * @readonly
   *
   * @description
   * Whether to offer "trust this device". Only the MFA screen has a session
   * to bind the device to, so it is off unless a page turns it on.
   *
   * @access public
   * @since 1.2.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly showTrustDevice: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   *
   * @description
   * Whatever the page's verify or resend call failed with, rendered above the
   * code so a rejected attempt is never silent. `null` while nothing has
   * failed.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly serverError: InputSignal<StoreError | null> = input<StoreError | null>(null);

  /**
   * Property resendAvailableIn
   * @readonly
   *
   * @description
   * Seconds before a new code may be requested. Each change reseeds the local
   * countdown, which disables the resend control and names the remaining wait.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<number>}
   */
  public readonly resendAvailableIn: InputSignal<number> = input<number>(0);

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
   * The edited code, and whether the device should be trusted afterwards.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<OtpFormValues>}
   */
  protected readonly model: WritableSignal<OtpFormValues> = signal<OtpFormValues>({
    code: '',
    trustDevice: false,
  });

  /**
   * Property cooldownRemaining
   * @readonly
   *
   * @description
   * Seconds left on the local resend countdown, ticked once per second in the
   * browser. Zero means the resend control is live again.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {WritableSignal<number>}
   */
  protected readonly cooldownRemaining: WritableSignal<number> = signal<number>(0);

  /**
   * Property platformId
   * @readonly
   *
   * @description
   * Distinguishes browser from server: the ticking interval is browser-only,
   * a server render just shows the seeded value once.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {object}
   */
  private readonly platformId: object = inject(PLATFORM_ID);

  /**
   * Property cooldownTimer
   *
   * @description
   * Handle of the ticking interval, cleared on reseed and on destroy.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {ReturnType<typeof setInterval> | null}
   */
  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

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

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Reseeds the resend countdown whenever the input changes, and stops the
   * ticking interval with the component.
   *
   * @access public
   * @since 1.1.0
   */
  public constructor() {
    effect((): void => {
      const seconds: number = this.resendAvailableIn();

      untracked((): void => this.restartCooldown(seconds));
    });

    inject(DestroyRef).onDestroy((): void => this.clearCooldownTimer());
  }
  //#endregion

  //#region Methods
  /**
   * Method restartCooldown
   * @method restartCooldown
   *
   * @description
   * Seeds the countdown with the given seconds and, in the browser, ticks it
   * down once per second until it reaches zero.
   *
   * @access private
   * @since 1.1.0
   *
   * @param {number} seconds - Seconds before resending becomes possible.
   *
   * @returns {void}
   */
  private restartCooldown(seconds: number): void {
    this.clearCooldownTimer();
    this.cooldownRemaining.set(Math.max(0, seconds));

    if (seconds <= 0 || !isPlatformBrowser(this.platformId)) return;

    this.cooldownTimer = setInterval((): void => {
      const next: number = this.cooldownRemaining() - 1;
      this.cooldownRemaining.set(Math.max(0, next));

      if (next <= 0) this.clearCooldownTimer();
    }, 1000);
  }

  /**
   * Method clearCooldownTimer
   * @method clearCooldownTimer
   *
   * @description
   * Stops the ticking interval, if any.
   *
   * @access private
   * @since 1.1.0
   *
   * @returns {void}
   */
  private clearCooldownTimer(): void {
    if (this.cooldownTimer === null) return;

    clearInterval(this.cooldownTimer);
    this.cooldownTimer = null;
  }

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
