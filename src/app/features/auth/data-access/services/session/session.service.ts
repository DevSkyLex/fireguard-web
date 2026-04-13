import { Injectable } from '@angular/core';
import { type Observable, catchError } from 'rxjs';
import type { HydraCollection } from '@core/models/api';
import { HydraApiService, type PaginationOptions } from '@core/services/hydra-api';
import type { SessionOutput } from '@features/auth/models';

/**
 * Service SessionService
 * @class SessionService
 * @extends {HydraApiService}
 *
 * @description
 * API service for user session management operations.
 * Allows listing active sessions and revoking sessions
 * for security purposes.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const sessionService = inject(SessionService);
 *
 * // List sessions
 * sessionService.list().subscribe(response => {
 *   response.member.forEach(session => {
 *     console.log('Session:', session.browser, session.isCurrent ? '(current)' : '');
 *   });
 * });
 *
 * // Revoke a session
 * sessionService.revoke(sessionId).subscribe(() => {
 *   console.log('Session revoked');
 * });
 * ```
 */
@Injectable({ providedIn: 'root' })
export class SessionService extends HydraApiService {
  //#region Constants
  /**
   * Constant BASE_PATH
   * @readonly
   * @static
   *
   * @description
   * Base path for all session API endpoints.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private static readonly BASE_PATH: string = '/api/sessions';
  //#endregion

  //#region Public Methods
  /**
   * Method list
   *
   * @description
   * Retrieves a paginated list of all active user sessions.
   * Includes information about device, browser, IP, and location.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {PaginationOptions} [options] - Pagination options (page, itemsPerPage).
   *
   * @returns {Observable<HydraCollection<SessionOutput>>} Observable emitting the sessions collection.
   */
  public list(options?: PaginationOptions): Observable<HydraCollection<SessionOutput>> {
    return this.getCollection<SessionOutput>(SessionService.BASE_PATH, options);
  }

  /**
   * Method get
   *
   * @description
   * Retrieves detailed information about a specific session.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} id - Session unique identifier.
   *
   * @returns {Observable<SessionOutput>} Observable emitting the session details.
   */
  public get(id: string): Observable<SessionOutput> {
    return this.getOne<SessionOutput>(`${SessionService.BASE_PATH}/${id}`);
  }

  /**
   * Method revoke
   *
   * @description
   * Revokes a specific session, invalidating its tokens
   * and forcing the user to re-authenticate on that device.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} id - Session unique identifier to revoke.
   *
   * @returns {Observable<void>} Observable completing on success.
   */
  public revoke(id: string): Observable<void> {
    return this.delete(`${SessionService.BASE_PATH}/${id}`);
  }

  /**
   * Method revokeAll
   *
   * @description
   * Revokes all user sessions except the current one.
   * Useful for security purposes (e.g., after password change).
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {Observable<void>} Observable completing on success.
   */
  public revokeAll(): Observable<void> {
    return this.http
      .post<void>(this.buildUrl(`${SessionService.BASE_PATH}/revoke-all`), null, {
        headers: this.buildHeaders(),
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }
  //#endregion
}
