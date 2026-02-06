import type {
  PasswordResetRequestOutput,
  PasswordResetResendOutput,
  PasswordResetVerifyOutput,
} from '@core/models/password-reset';
import type { Operation } from '../operations';

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
   * Property requestOperation
   * @readonly
   *
   * @description
   * Password reset request operation state.
   *
   * @since 1.0.0
   *
   * @type {Operation<PasswordResetRequestOutput, unknown>}
   */
  readonly requestOperation: Operation<PasswordResetRequestOutput, unknown>;

  /**
   * Property confirmOperation
   * @readonly
   *
   * @description
   * Password reset confirmation operation state.
   *
   * @since 1.0.0
   *
   * @type {Operation<PasswordResetVerifyOutput, unknown>}
   */
  readonly confirmOperation: Operation<PasswordResetVerifyOutput, unknown>;

  /**
   * Property resendOperation
   * @readonly
   *
   * @description
   * Password reset code resend operation state.
   *
   * @since 1.0.0
   *
   * @type {Operation<PasswordResetResendOutput, unknown>}
   */
  readonly resendOperation: Operation<PasswordResetResendOutput, unknown>;
}
