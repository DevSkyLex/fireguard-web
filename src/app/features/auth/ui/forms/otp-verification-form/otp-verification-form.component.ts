import {
  Component,
  ChangeDetectionStrategy,
  inject,
  output,
  input,
  signal,
  computed,
  effect,
  type OutputEmitterRef,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  type FormGroup,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputOtpModule } from 'primeng/inputotp';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import type { OtpVerificationFormData, OtpVerificationFormValues } from './models';

/**
 * Component OtpVerificationForm
 * @class OtpVerificationForm
 *
 * @description
 * Generic OTP verification form component.
 * Handles OTP code submission for various purposes (MFA, password reset, etc.).
 * This is a presentational component with no direct store dependencies.
 *
 * @version 2.0.0
 *
 * @example
 * ```html
 * <!-- MFA Login -->
 * <app-otp-verification-form
 *   [showTrustDevice]="true"
 *   [loading]="isLoading()"
 *   (submitted)="handleSubmit($event)"
 *   (cancelled)="handleCancel()"
 * />
 *
 * <!-- Password Reset -->
 * <app-otp-verification-form
 *   [showTrustDevice]="false"
 *   [loading]="isLoading()"
 *   (submitted)="handlePasswordResetOtp($event)"
 *   (cancelled)="handleCancel()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-otp-verification-form',
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    MessageModule,
    IconFieldModule,
    InputIconModule,
    InputOtpModule,
    CheckboxModule,
  ],
  templateUrl: './otp-verification-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtpVerificationForm {
  //#region Inputs
  /**
   * Property showTrustDevice
   * @input
   * @readonly
   *
   * @description
   * Whether to show the "Trust this device" checkbox.
   * Typically true for MFA login, false for other purposes.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   *
   * @default false
   */
  public readonly showTrustDevice: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property loading
   * @input
   * @readonly
   *
   * @description
   * Whether the verification request is in progress.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   *
   * @default false
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property resendIn
   * @input
   * @readonly
   *
   * @description
   * Seconds to wait before allowing resend.
   * When provided, displays a countdown timer.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<number | null>}
   *
   * @default null
   */
  public readonly resendIn: InputSignal<number | null> = input<number | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @output
   * @readonly
   *
   * @description
   * Emitted when form is submitted with valid OTP code.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {OutputEmitterRef<OtpVerificationFormValues>}
   */
  public readonly submitted: OutputEmitterRef<OtpVerificationFormValues> =
    output<OtpVerificationFormValues>();

  /**
   * Property cancelled
   * @output
   * @readonly
   *
   * @description
   * Emitted when user cancels the verification.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();

  /**
   * Property resend
   * @output
   * @readonly
   *
   * @description
   * Emitted when user requests to resend the verification code.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly resend: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property formBuilder
   * @readonly
   *
   * @description
   * Reactive form builder.
   *
   * @access private
   * @since 2.0.0
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
   * Reactive form for OTP input and trust device option.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {FormGroup<OtpVerificationFormData>}
   */
  protected readonly form: FormGroup<OtpVerificationFormData> =
    this.formBuilder.group<OtpVerificationFormData>({
      code: this.formBuilder.control<string>('', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(6),
        Validators.pattern(/^\d{6}$/),
      ]),
      trustDevice: this.formBuilder.control<boolean>(false),
    });

  /**
   * Property resendCountdown
   * @readonly
   *
   * @description
   * Current countdown value for resend cooldown.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {WritableSignal<number>}
   */
  protected readonly resendCountdown: WritableSignal<number> = signal<number>(0);

  /**
   * Computed canResend
   * @readonly
   *
   * @description
   * Whether the user can resend the code (countdown expired).
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canResend: Signal<boolean> = computed<boolean>(
    () => this.resendCountdown() === 0,
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Sets up countdown timer for resend button.
   */
  public constructor() {
    // Initialize and update countdown from input (reacts to resend responses)
    effect(() => {
      const initialCountdown = this.resendIn();
      if (initialCountdown !== null && initialCountdown > 0) {
        this.resendCountdown.set(initialCountdown);
      } else if (initialCountdown === 0 || initialCountdown === null) {
        // Reset to 0 if backend says ready to resend
        this.resendCountdown.set(0);
      }
    });

    // Decrement countdown every second
    effect((onCleanup) => {
      if (this.resendCountdown() > 0) {
        const interval = setInterval(() => {
          this.resendCountdown.update((value) => Math.max(0, value - 1));
        }, 1000);

        onCleanup(() => clearInterval(interval));
      }
    });
  }

  //#region Methods
  /**
   * Method onSubmit
   *
   * @description
   * Submit form and emit values to parent component.
   * Parent component is responsible for handling verification logic.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected onSubmit(): void {
    if (this.form.invalid) return;

    const formValues: OtpVerificationFormValues = this.form.getRawValue();
    this.submitted.emit(formValues);
  }

  /**
   * Method onCancel
   *
   * @description
   * Cancel verification and emit event to parent component.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected onCancel(): void {
    this.cancelled.emit();
  }

  /**
   * Method onResend
   *
   * @description
   * Request to resend verification code and emit event to parent component.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected onResend(): void {
    this.resend.emit();
  }
  //#endregion
}
