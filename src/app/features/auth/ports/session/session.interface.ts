import type { Signal } from '@angular/core';
import type { Observable } from 'rxjs';

/**
 * AuthSessionPort
 * @interface AuthSessionPort
 *
 * @description
 * Auth-owned contract for consuming session behavior outside the auth
 * feature implementation. Infrastructure and shell consumers depend on this
 * contract instead of importing auth stores directly.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface AuthSessionPort {
  readonly accessToken: Signal<string | null>;
  readonly isAuthenticated: Signal<boolean>;
  readonly initialized: Signal<boolean>;

  clearSession(): void;

  /**
   * Method renewSession
   *
   * @description
   * Exchanges the refresh-token cookie for a fresh access token.
   *
   * Concurrent callers share one in-flight request, so a burst of simultaneous
   * failures cannot fire a burst of refreshes against a rotating token.
   *
   * @returns {Observable<string | null>} The new access token, or `null` when the
   *   session could not be renewed.
   */
  renewSession(): Observable<string | null>;
}
