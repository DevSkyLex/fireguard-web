import type { CallState } from '@core/state/request-state';
import type {
  PasswordResetRequestOutput,
  PasswordResetResendOutput,
  PasswordResetVerifyOutput,
} from '@features/auth/models';

/**
 * Interface PasswordResetState
 * @interface PasswordResetState
 *
 * @description
 * State shape for password reset store.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface PasswordResetState {
  /**
   * Property currentRequest
   * @readonly
   *
   * @description
   * Current password reset request (contains token and countdown).
   * Can be either a request or resend response.
   *
   * @since 1.0.0
   *
   * @type {PasswordResetRequestOutput | PasswordResetResendOutput | null}
   */
  readonly currentRequest: PasswordResetRequestOutput | PasswordResetResendOutput | null;

  /**
   * Property challengeToken
   * @readonly
   *
   * @description
   * Challenge token used for confirmation.
   *
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly challengeToken: string | null;

  /**
   * Property verificationCode
   * @readonly
   *
   * @description
   * Code entered by the user during reset flow.
   *
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly verificationCode: string | null;

  /**
   * Property requestCallState
   * @readonly
   *
   * @description
   * Password reset request call state.
   *
   * @since 1.0.0
   *
   * @type {CallState<PasswordResetRequestOutput>}
   */
  readonly requestCallState: CallState<PasswordResetRequestOutput>;

  /**
   * Property confirmCallState
   * @readonly
   *
   * @description
   * Password reset confirmation call state.
   *
   * @since 1.0.0
   *
   * @type {CallState<PasswordResetVerifyOutput>}
   */
  readonly confirmCallState: CallState<PasswordResetVerifyOutput>;

  /**
   * Property resendCallState
   * @readonly
   *
   * @description
   * Password reset code resend call state.
   *
   * @since 1.0.0
   *
   * @type {CallState<PasswordResetResendOutput>}
   */
  readonly resendCallState: CallState<PasswordResetResendOutput>;
}
