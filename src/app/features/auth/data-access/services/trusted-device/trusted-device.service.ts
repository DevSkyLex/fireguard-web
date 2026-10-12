import { Service } from '@angular/core';
import { catchError, type Observable } from 'rxjs';
import { HydraApiService, type PaginationOptions } from '@core/api';
import type { ApiRequestOptions } from '@core/api/models';
import type { HydraCollection } from '@core/api/models';
import type { TrustDeviceOutput, TrustedDeviceOutput } from '@features/auth/models';

/**
 * Service TrustedDeviceService
 * @class TrustedDeviceService
 *
 * @description
 * API service for trusted device management.
 * Allows users to trust devices for MFA bypass, list trusted devices,
 * and revoke trust.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @extends {HydraApiService}
 *
 * @example
 * ```typescript
 * const trustedDeviceService = inject<TrustedDeviceService>(TrustedDeviceService);
 *
 * // Trust current device
 * trustedDeviceService.trustDevice().subscribe(response => {
 *   console.log('Device trusted:', response.deviceName);
 * });
 *
 * // List trusted devices
 * trustedDeviceService.list().subscribe(devices => {
 *   console.log('Trusted devices:', devices.member);
 * });
 *
 * // Revoke a device
 * trustedDeviceService.revoke('device-uuid').subscribe(() => {
 *   console.log('Device revoked');
 * });
 * ```
 */
@Service()
export class TrustedDeviceService extends HydraApiService {
  //#region Constants
  /**
   * Property BASE_PATH
   * @readonly
   * @static
   *
   * @description
   * Base path for all trusted device API endpoints.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private static readonly BASE_PATH: string = '/api/trusted-devices';
  //#endregion

  //#region Public Methods
  /**
   * Method trustDevice
   *
   * @description
   * Registers the current device as trusted.
   * The API will automatically set a HTTP-only cookie with the trust token.
   * This allows the device to bypass MFA verification for future logins.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {ApiRequestOptions} options - Transport identity retained for the same immutable write
   *   intent.
   *
   * @returns {Observable<TrustDeviceOutput>} Observable emitting the trust response.
   */
  public trustDevice(options?: ApiRequestOptions): Observable<TrustDeviceOutput> {
    return this.postAction<TrustDeviceOutput>(TrustedDeviceService.BASE_PATH, options);
  }

  /**
   * Method list
   *
   * @description
   * Retrieves a paginated list of trusted devices for the current user.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {PaginationOptions} [options] - Pagination options (page, itemsPerPage).
   *
   * @returns {Observable<HydraCollection<TrustedDeviceOutput>>} Observable emitting the collection.
   */
  public list(options?: PaginationOptions): Observable<HydraCollection<TrustedDeviceOutput>> {
    return this.getCollection<TrustedDeviceOutput>(TrustedDeviceService.BASE_PATH, options);
  }

  /**
   * Method revoke
   *
   * @description
   * Revokes trust for a specific device.
   * The device will need to complete MFA verification on next login.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} deviceId - UUID of the device to revoke.
   * @param {ApiRequestOptions} options - Transport identity retained for the same immutable write
   *   intent.
   *
   * @returns {Observable<void>} Observable completing on success.
   */
  public revoke(deviceId: string, options?: ApiRequestOptions): Observable<void> {
    return this.delete(`${TrustedDeviceService.BASE_PATH}/${deviceId}`, options);
  }

  /**
   * Method revokeAll
   *
   * @description
   * Revokes trust for all devices of the current user.
   * All devices will need to complete MFA verification on next login.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {ApiRequestOptions} options - Transport identity retained for the same immutable write
   *   intent.
   *
   * @returns {Observable<void>} Observable completing on success.
   */
  public revokeAll(options?: ApiRequestOptions): Observable<void> {
    return this.http
      .post<void>(this.buildUrl(`${TrustedDeviceService.BASE_PATH}/revoke-all`), null, {
        headers: this.buildWriteHeaders(options),
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }
  //#endregion
}
