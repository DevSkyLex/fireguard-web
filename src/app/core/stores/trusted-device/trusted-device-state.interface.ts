import type { Operation } from '@core/stores/operations';

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
   * Property isLoading
   * @readonly
   *
   * @description
   * True while a device-list request is in-flight. Set to `true` at the
   * start of every `load` / `loadDevices` call and back to `false` on
   * both success and error.
   *
   * @since 2.0.0
   *
   * @type {boolean}
   */
  readonly isLoading: boolean;

  /**
   * Property revokeOperation
   * @readonly
   *
   * @description
   * Loading / success / error state for revoking a single trusted device.
   * Starts idle and transitions through loading → success | error when
   * {@link TrustedDeviceStore#revokeDevice} is called.
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
   * Loading / success / error state for revoking all trusted devices.
   * Starts idle and transitions through loading → success | error when
   * {@link TrustedDeviceStore#revokeAllDevices} is called.
   *
   * @since 1.0.0
   *
   * @type {Operation<void, unknown>}
   */
  readonly revokeAllOperation: Operation<void, unknown>;
  //#endregion
}
