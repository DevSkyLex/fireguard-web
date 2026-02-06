import type { HydraItem } from '../api';

/**
 * Interface TrustDeviceOutput
 * @interface TrustDeviceOutput
 * @extends {HydraItem}
 *
 * @description
 * Output returned when a device is successfully trusted.
 * Contains the device ID, token, name, and expiration date.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface TrustDeviceOutput extends HydraItem {
  /**
   * Property deviceId
   * @readonly
   *
   * @description
   * Unique identifier (UUID) for the trusted device.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly deviceId: string;

  /**
   * Property token
   * @readonly
   *
   * @description
   * Trusted device token used for bypassing MFA on this device.
   * This token is also stored in a HTTP-only cookie by the API.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly token: string;

  /**
   * Property deviceName
   * @readonly
   *
   * @description
   * Friendly name for the device (derived from User-Agent).
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly deviceName: string;

  /**
   * Property expiresAt
   * @readonly
   *
   * @description
   * ISO 8601 date-time when the trusted device token expires.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly expiresAt: string;
}
