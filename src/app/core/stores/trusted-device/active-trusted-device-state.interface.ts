import type { TrustDeviceOutput } from '@core/models/trusted-device';
import type { Operation } from '@core/stores/operations';

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
   * Property trustOperation
   * @readonly
   *
   * @description
   * Loading / success / error state for the trust-device API call.
   * Starts idle and transitions through loading → success | error when
   * {@link ActiveTrustedDeviceStore#trustDevice} is called.
   *
   * @since 1.0.0
   *
   * @type {Operation<TrustDeviceOutput, unknown>}
   */
  readonly trustOperation: Operation<TrustDeviceOutput, unknown>;
  //#endregion
}
