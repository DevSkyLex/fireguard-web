import type { CallState } from '@core/request-state';
import type { LoginOutput, RegisterOutput } from '@features/auth/models';

/**
 * Interface RegisterState
 * @interface RegisterState
 *
 * @description
 * State shape for the registration store.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface RegisterState {
  /**
   * Property currentChallenge
   * @readonly
   *
   * @description
   * The latest registration/resend response (token + countdown).
   *
   * @since 1.0.0
   *
   * @type {RegisterOutput | null}
   */
  readonly currentChallenge: RegisterOutput | null;

  /**
   * Property challengeToken
   * @readonly
   *
   * @description
   * Challenge token used for the verify step.
   *
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly challengeToken: string | null;

  /**
   * Property maskedRecipient
   * @readonly
   *
   * @description
   * Masked email where the verification code was sent.
   *
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly maskedRecipient: string | null;

  /**
   * Property requestCallState
   * @readonly
   *
   * @description
   * Registration request call state.
   *
   * @since 1.0.0
   *
   * @type {CallState<RegisterOutput>}
   */
  readonly requestCallState: CallState<RegisterOutput>;

  /**
   * Property verifyCallState
   * @readonly
   *
   * @description
   * Email verification (auto-login) call state.
   *
   * @since 1.0.0
   *
   * @type {CallState<LoginOutput>}
   */
  readonly verifyCallState: CallState<LoginOutput>;

  /**
   * Property resendCallState
   * @readonly
   *
   * @description
   * Verification code resend call state.
   *
   * @since 1.0.0
   *
   * @type {CallState<RegisterOutput>}
   */
  readonly resendCallState: CallState<RegisterOutput>;
}
