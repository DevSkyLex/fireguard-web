import type { HydraItem } from '../api';

/**
 * Interface TrustedDeviceOutput
 * @interface TrustedDeviceOutput
 * @extends {HydraItem}
 *
 * @description
 * Output for a trusted device in the list.
 * Contains device information including usage and expiration dates.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface TrustedDeviceOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique identifier (UUID) for the trusted device.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Friendly name for the device (derived from User-Agent).
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property lastUsedAt
   * @readonly
   *
   * @description
   * ISO 8601 date-time of the last time the device was used.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly lastUsedAt: string;

  /**
   * Property expiresAt
   * @readonly
   *
   * @description
   * ISO 8601 date-time when the trust expires.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly expiresAt: string;

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * ISO 8601 date-time when the device was added.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly createdAt: string;
}
