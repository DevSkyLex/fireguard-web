import type { Signal } from '@angular/core';

/**
 * AuthLogoutPort
 * @interface AuthLogoutPort
 *
 * @description
 * Auth-owned contract for consuming logout behavior outside the auth
 * feature implementation. Layout and shell consumers depend on this
 * contract instead of importing the concrete AuthStore directly.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface AuthLogoutPort {
  /**
   * Property isLoggingOut
   *
   * @description
   * Signal indicating whether a logout request is currently in flight.
   *
   * @type {Signal<boolean>}
   */
  readonly isLoggingOut: Signal<boolean>;

  /**
   * Method logout
   *
   * @description
   * Initiates the logout flow.
   *
   * @returns {void}
   */
  logout(): void;
}
