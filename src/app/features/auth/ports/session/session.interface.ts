import type { Signal } from '@angular/core';
import type { Observable } from 'rxjs';

/**
 * Interface AuthSessionPort
 * @interface AuthSessionPort
 *
 * @description
 * Auth-owned contract for consuming session behavior outside the auth
 * feature implementation. Infrastructure and shell consumers depend on this
 * contract instead of importing auth stores directly.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface AuthSessionPort {
  /**
   * Property sessionRevision
   * @readonly
   *
   * @description
   * Local session identity; changes on replacement or clearing, never on bearer rotation.
   *
   * @access public
   *
   * @type {Signal<number>}
   */
  readonly sessionRevision: Signal<number>;

  /**
   * Property accessToken
   * @readonly
   *
   * @description
   * Current in-memory bearer used by authenticated requests; null when none is established.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {Signal<string | null>}
   */
  readonly accessToken: Signal<string | null>;

  /**
   * Property isAuthenticated
   * @readonly
   *
   * @description
   * Established local session, including an expired bearer awaiting silent renewal.
   *
   * @type {Signal<boolean>}
   */
  readonly isAuthenticated: Signal<boolean>;

  /**
   * Property initialized
   * @readonly
   *
   * @description
   * Indicates that local session bootstrap has completed.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {Signal<boolean>}
   */
  readonly initialized: Signal<boolean>;

  /**
   * Method clearSession
   * @method clearSession
   *
   * @description
   * Ends the current local session and clears its authenticated state.
   *
   * @access public
   * @since 0.1.0
   *
   * @returns {void}
   */
  clearSession(): void;

  /**
   * Method renewSession
   * @method renewSession
   *
   * @description
   * Exchanges the refresh-token cookie for a fresh access token.
   * Concurrent callers share one in-flight request, so a burst of simultaneous
   * failures cannot fire a burst of refreshes against a rotating token.
   *
   * @returns {Observable<string | null>} The new access token, or `null` when the
   *   session could not be renewed.
   */
  renewSession(): Observable<string | null>;
}
