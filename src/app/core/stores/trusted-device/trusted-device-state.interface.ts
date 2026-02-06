import type { TrustDeviceOutput, TrustedDeviceOutput } from '@core/models/trusted-device';
import type { CollectionOperation, Operation } from '@core/stores/operations';

/**
 * Interface TrustedDeviceState
 * @interface TrustedDeviceState
 *
 * @description
 * State interface for the trusted device store.
 * Manages trusted devices list and trust operations.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface TrustedDeviceState {
  //#region Device Data
  /**
   * Property devices
   * @readonly
   *
   * @description
   * List of trusted devices for the current user.
   *
   * @since 1.0.0
   *
   * @type {TrustedDeviceOutput[]}
   */
  readonly devices: TrustedDeviceOutput[];

  /**
   * Property pendingTrustDevice
   * @readonly
   *
   * @description
   * Flag indicating if device trust should be requested after MFA verification.
   * Used to defer the trust API call until authentication is complete.
   *
   * @since 1.0.0
   *
   * @type {boolean}
   */
  readonly pendingTrustDevice: boolean;
  //#endregion

  //#region Operations
  /**
   * Property listOperation
   * @readonly
   *
   * @description
   * Async operation state for loading the devices list.
   *
   * @since 1.0.0
   *
   * @type {CollectionOperation<TrustedDeviceOutput, unknown>}
   */
  readonly listOperation: CollectionOperation<TrustedDeviceOutput, unknown>;

  /**
   * Property trustOperation
   * @readonly
   *
   * @description
   * Async operation state for trusting the current device.
   *
   * @since 1.0.0
   *
   * @type {Operation<TrustDeviceOutput, unknown>}
   */
  readonly trustOperation: Operation<TrustDeviceOutput, unknown>;

  /**
   * Property revokeOperation
   * @readonly
   *
   * @description
   * Async operation state for revoking a trusted device.
   *
   * @since 1.0.0
   *
   * @type {Operation<void, unknown>}
   */
  readonly revokeOperation: Operation<void, unknown>;

  /**
   * Property revokeAllOperation
   * @readonly
   *
   * @description
   * Async operation state for revoking all trusted devices.
   *
   * @since 1.0.0
   *
   * @type {Operation<void, unknown>}
   */
  readonly revokeAllOperation: Operation<void, unknown>;
  //#endregion
}
