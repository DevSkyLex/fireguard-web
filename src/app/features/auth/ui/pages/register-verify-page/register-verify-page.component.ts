import {
  Component,
  ChangeDetectionStrategy,
  inject,
  effect,
  computed,
  type Signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore, RegisterStore } from '@features/auth/state';
import { OtpVerificationForm, type OtpVerificationFormValues } from '@features/auth/ui/forms';

/**
 * Component RegisterVerifyPage
 * @class RegisterVerifyPage
 *
 * @description
 * Email-verification step of the registration flow. Hosts the shared
 * {@link OtpVerificationForm}, verifies the code through the
 * {@link RegisterStore}, and — once the resulting session is applied to the
 * {@link AuthStore} — redirects the now-authenticated user into onboarding.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-register-verify-page',
  imports: [OtpVerificationForm],
  templateUrl: './register-verify-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterVerifyPage {
  //#region Properties
  /**
   * Property registerStore
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {RegisterStore}
   */
  protected readonly registerStore: RegisterStore = inject<RegisterStore>(RegisterStore);

  /**
   * Property authStore
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {AuthStore}
   */
  private readonly authStore: AuthStore = inject<AuthStore>(AuthStore);

  /**
   * Property router
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Computed loading
   * @readonly
   *
   * @description
   * Whether verification is in progress.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly loading: Signal<boolean> = computed(() => this.registerStore.isVerifying());

  /**
   * Computed maskedRecipient
   * @readonly
   *
   * @description
   * The masked email where the verification code was sent.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly maskedRecipient: Signal<string | null> = computed(() =>
    this.registerStore.maskedRecipient(),
  );

  /**
   * Computed resendIn
   * @readonly
   *
   * @description
   * Seconds to wait before allowing a resend.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number | null>}
   */
  protected readonly resendIn: Signal<number | null> = computed(
    () => this.registerStore.currentChallenge()?.canResendIn ?? null,
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Redirects into onboarding once authenticated, and shows toasts for
   * verification / resend failures.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect(() => {
      if (this.authStore.isAuthenticated()) {
        this.router.navigate(['/onboarding']).catch(() => undefined);
      }
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method handleVerify
   *
   * @description
   * Submits the OTP code for verification.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OtpVerificationFormValues} values - Form values.
   *
   * @returns {void}
   */
  protected handleVerify(values: OtpVerificationFormValues): void {
    this.registerStore.verify({ code: values.code });
  }

  /**
   * Method handleResend
   *
   * @description
   * Requests a new verification code.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected handleResend(): void {
    this.registerStore.resend();
  }

  /**
   * Method handleCancel
   *
   * @description
   * Abandons verification and returns to the registration form.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {Promise<void>}
   */
  protected async handleCancel(): Promise<void> {
    this.registerStore.clear();
    await this.router.navigate(['/auth/register']).catch(() => undefined);
  }
  //#endregion
}
