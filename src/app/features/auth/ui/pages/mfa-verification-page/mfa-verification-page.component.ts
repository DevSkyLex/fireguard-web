import {
  Component,
  ChangeDetectionStrategy,
  inject,
  effect,
  computed,
  type Signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import { AuthStore, authStoreEvents } from '@features/auth/state';
import { ActiveTrustedDeviceStore } from '@features/auth/state';
import { OtpVerificationForm, type OtpVerificationFormValues } from '@features/auth/ui/forms';

/**
 * Component MfaVerificationPage
 * @class MfaVerificationPage
 *
 * @description
 * MFA (Multi-Factor Authentication) verification page.
 * Handles second factor authentication during login flow.
 *
 * **Usage:**
 * - User logs in with email/password
 * - If MFA is required → Navigate to /auth/mfa-verify
 * - Context stored in AuthStore (mfaToken, mfaRequired)
 * - Uses dedicated endpoint: POST /api/auth/mfa/verify
 *
 * **Flow:**
 * 1. User submits login credentials
 * 2. Backend returns 201 with mfaToken (MFA required)
 * 3. Frontend navigates to /auth/mfa-verify
 * 4. User enters OTP code
 * 5. Verification successful → Navigate to /
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-mfa-verification-page',
  imports: [OtpVerificationForm],
  templateUrl: './mfa-verification-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MfaVerificationPage {
  //#region Properties
  /**
   * Property authStore
   * @readonly
   *
   * @description
   * Authentication store for accessing MFA state
   * and performing verification.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {AuthStore}
   */
  private readonly authStore: AuthStore = inject<AuthStore>(AuthStore);

  /**
   * Property activeTrustedDeviceStore
   * @readonly
   *
   * @description
   * Root-level trusted-device store for handling "trust this device"
   * option during MFA.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveTrustedDeviceStore}
   */
  private readonly activeTrustedDeviceStore: ActiveTrustedDeviceStore =
    inject<ActiveTrustedDeviceStore>(ActiveTrustedDeviceStore);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Angular router for navigation after successful
   * MFA or cancellation.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property messageService
   * @readonly
   *
   * @description
   * PrimeNG message service for displaying API errors
   * during MFA verification.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {MessageService}
   */
  private readonly messageService: MessageService = inject<MessageService>(MessageService);

  /**
   * Property events
   * @readonly
   *
   * @description
   * NgRx events stream for subscribing to AuthStore events
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Events}
   */
  private readonly events: Events = inject<Events>(Events);

  /**
   * Computed showTrustDevice
   * @readonly
   *
   * @description
   * Always show trust device checkbox for MFA login.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly showTrustDevice: Signal<boolean> = computed(() => true);

  /**
   * Computed loading
   * @readonly
   *
   * @description
   * MFA verification loading state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly loading: Signal<boolean> = computed(() => this.authStore.isVerifyingMfa());

  /**
   * Computed resendIn
   * @readonly
   *
   * @description
   * Seconds to wait before allowing MFA code resend.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number | null>}
   */
  protected readonly resendIn: Signal<number | null> = computed(() => {
    const loginOp = this.authStore.loginCallState();
    return loginOp.data?.mfa_resend_in ?? null;
  });
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Sets up navigation after successful MFA verification
   * and error handling for MFA failures.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    // Navigate to home when authenticated
    effect(() => {
      if (this.authStore.isAuthenticated()) {
        this.router.navigate(['/']).catch(() => undefined);
      }
    });

    // Show error messages for MFA verification failures
    this.events
      .on(authStoreEvents.mfaVerifyFailed)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        this.messageService.add({
          severity: 'error',
          summary: $localize`:@@common.error:Error`,
          detail: payload.message,
          life: 5000,
        });
      });

    // Show error messages for MFA resend failures
    this.events
      .on(authStoreEvents.mfaResendFailed)
      .pipe(takeUntilDestroyed())
      .subscribe(({ payload }) => {
        this.messageService.add({
          severity: 'error',
          summary: $localize`:@@common.error:Error`,
          detail: payload.message,
          life: 5000,
        });
      });
  }
  //#endregion

  //#region Methods
  /**
   * Method handleOtpSubmit
   *
   * @description
   * Handles MFA OTP form submission.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {OtpVerificationFormValues} values - Form values.
   *
   * @returns {void}
   */
  protected handleOtpSubmit(values: OtpVerificationFormValues): void {
    const mfaToken: string | null = this.authStore.mfaToken();
    if (!mfaToken) return;

    // Set pending trust device if user checked the option
    if (values.trustDevice) {
      this.activeTrustedDeviceStore.setPendingTrustDevice(true);
    }

    // Verify MFA code (AuthStore will handle trustDevice automatically on success)
    this.authStore.mfaVerify({
      preAuthToken: mfaToken,
      code: values.code,
    });
  }

  /**
   * Method handleOtpCancel
   *
   * @description
   * Handles MFA verification cancellation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {Promise<void>}
   */
  protected async handleOtpCancel(): Promise<void> {
    this.authStore.clearMfaState();
    await this.router.navigate(['/auth/login']).catch(() => undefined);
  }

  /**
   * Method handleOtpResend
   *
   * @description
   * Handles MFA code resend request.
   * Calls the store resend method to get new MFA and challenge tokens.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected handleOtpResend(): void {
    this.authStore.mfaResend();
  }

  //#endregion
}
