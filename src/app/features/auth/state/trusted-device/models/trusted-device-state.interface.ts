import type { CallState } from '@core/request-state';

/**
 * Interface TrustedDeviceState
 * @interface TrustedDeviceState
 *
 * @description
 * Component-scoped state for the trusted-device list store. Entities are
 * managed by the `withEntities` feature (providing `deviceEntities`,
 * `deviceEntityMap`, `deviceIds`). This interface tracks auxiliary state:
 * list loading flag and mutation operation tracking.
 *
 * For the `pendingTrustDevice` flag and trust-device API call, see
 * {@link ActiveTrustedDeviceState}.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface TrustedDeviceState {
  //#region Properties
  /**
   * Property totalDevices
   * @readonly
   *
   * @description
   * Total number of trusted devices across all pages.
   *
   * @since 2.1.0
   *
   * @type {number}
   */
  readonly totalDevices: number;

  /**
   * Property listCallState
   * @readonly
   *
   * @description
   * Tracks the loading state of the device list.
   *
   * @since 2.0.0
   *
   * @type {CallState}
   */
  readonly listCallState: CallState;

  /**
   * Property revokeCallState
   * @readonly
   *
   * @description
   * Call state for revoking a single trusted device.
   *
   * @since 1.0.0
   *
   * @type {CallState}
   */
  readonly revokeCallState: CallState;

  /**
   * Property revokeAllCallState
   * @readonly
   *
   * @description
   * Call state for revoking all trusted devices.
   *
   * @since 1.0.0
   *
   * @type {CallState}
   */
  readonly revokeAllCallState: CallState;
  //#endregion
}
