import type { CallState } from '@core/request-state';
import type { TrustDeviceOutput } from '@features/auth/models';

/**
 * Interface ActiveTrustedDeviceState
 * @interface ActiveTrustedDeviceState
 *
 * @description
 * Root-level state for the active trusted-device store. Tracks the
 * `pendingTrustDevice` flag used during the MFA authentication flow
 * and the `trustOperation` that registers the current device as trusted.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface ActiveTrustedDeviceState {
  //#region Properties
  /**
   * Property pendingTrustDevice
   * @readonly
   *
   * @description
   * Flag indicating whether device trust should be requested after MFA
   * verification completes. Set by the MFA page when the user checks
   * "Trust this device" and consumed by the auth store on successful
   * verification.
   *
   * @since 1.0.0
   *
   * @type {boolean}
   */
  readonly pendingTrustDevice: boolean;

  /**
   * Property trustCallState
   * @readonly
   *
   * @description
   * Call state for the trust-device API call.
   *
   * @since 1.0.0
   *
   * @type {CallState<TrustDeviceOutput>}
   */
  readonly trustCallState: CallState<TrustDeviceOutput>;
  //#endregion
}
