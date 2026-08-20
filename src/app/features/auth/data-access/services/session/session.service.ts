import { Service } from '@angular/core';
import { type Observable } from 'rxjs';
import { HydraApiService, type PaginationOptions } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type { RevokeOtherSessionsOutput, SessionOutput } from '@features/auth/models';

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
 * const sessionService = inject<SessionService>(SessionService);
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
@Service()
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
   * Method revokeOthers
   *
   * @description
   * Revokes every session except the caller's current one. Idempotent,
   * `200` with the number of sessions actually revoked.
   *
   * The API also exposes `POST /sessions/revoke-all` (current session
   * included, `204`); it is deliberately not wired here — signing the
   * caller out belongs to the logout flow, not to a session-management
   * panel.
   *
   * @access public
   * @since 1.1.0
   *
   * @returns {Observable<RevokeOtherSessionsOutput>} How many sessions were revoked.
   */
  public revokeOthers(): Observable<RevokeOtherSessionsOutput> {
    return this.postAction<RevokeOtherSessionsOutput>(`${SessionService.BASE_PATH}/revoke-others`);
  }
  //#endregion
}
