import { InjectionToken, type Signal } from '@angular/core';

/**
 * AuthSessionPort
 * @interface AuthSessionPort
 *
 * @description
 * Core-owned port interface for consuming auth session behavior.
 * Infrastructure (interceptors, services) depends on this abstraction
 * instead of importing feature stores directly.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface AuthSessionPort {
  //#region Properties
  /**
   * Property accessToken
   * @readonly
   *
   * @description
   * Current access token. Null when unauthenticated.
   *
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  readonly accessToken: Signal<string | null>;

  /**
   * Property initialized
   * @readonly
   *
   * @description
   * True once the session check has completed on startup.
   *
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  readonly initialized: Signal<boolean>;
  //#endregion

  //#region Methods
  /**
   * Method clearSession
   * @method clearSession
   *
   * @description
   * Clears the current auth session, removing any stored tokens
   * and resetting session state. Used for logout and session
   * expiration handling.
   *
   * @since 1.0.0
   *
   * @returns {void}
   */
  clearSession(): void;
  //#endregion
}

/**
 * Constant AUTH_SESSION
 * @const AUTH_SESSION
 *
 * @description
 * Injection token for the AuthSessionPort.
 * Provided by the auth feature via provideAuth().
 *
 * @type {InjectionToken<AuthSessionPort>}
 */
export const AUTH_SESSION: InjectionToken<AuthSessionPort> =
  new InjectionToken<AuthSessionPort>('AUTH_SESSION');
