import type { CallState } from '@core/request-state';
import type {
  ConfirmTotpOutput,
  DisableTotpOutput,
  SetupTotpOutput,
} from '@features/account/models';

/**
 * Interface AccountTotpEnrollmentState
 * @interface AccountTotpEnrollmentState
 *
 * @description
 * State of the authenticator app (TOTP) enrollment workflow: the request
 * states of the three lifecycle calls (`setup`, `confirm`, `disable`). The
 * authoritative enrollment status (`totpEnabled`) lives on the account-owned
 * user profile (`UserStore`), not here — this slice only tracks the
 * in-progress workflow and reloads the profile after `confirm`/`disable`.
 *
 * @since 1.0.0
 */
export interface AccountTotpEnrollmentState {
  /**
   * Property setupCallState
   *
   * @description
   * Request state of the TOTP setup operation (generates a pending secret).
   *
   * @type {CallState<SetupTotpOutput>}
   */
  readonly setupCallState: CallState<SetupTotpOutput>;

  /**
   * Property confirmCallState
   *
   * @description
   * Request state of the TOTP confirmation operation (activates the pending
   * secret with a verification code).
   *
   * @type {CallState<ConfirmTotpOutput>}
   */
  readonly confirmCallState: CallState<ConfirmTotpOutput>;

  /**
   * Property disableCallState
   *
   * @description
   * Request state of the TOTP disable operation (requires a valid current
   * code as proof of possession).
   *
   * @type {CallState<DisableTotpOutput>}
   */
  readonly disableCallState: CallState<DisableTotpOutput>;
}
