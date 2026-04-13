import type { Signal } from '@angular/core';

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
  readonly initialized: Signal<boolean>;

  clearSession(): void;
}
