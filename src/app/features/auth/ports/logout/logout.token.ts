import { InjectionToken } from '@angular/core';
import type { AuthLogoutPort } from './logout.interface';

/**
 * Constant AUTH_LOGOUT_PORT
 * @const AUTH_LOGOUT_PORT
 *
 * @description
 * Injection token for the auth-owned AuthLogoutPort.
 * Bound by `features/auth/providers/`.
 * Consumed by layouts and approved external consumers.
 *
 * @type {InjectionToken<AuthLogoutPort>}
 */
export const AUTH_LOGOUT_PORT: InjectionToken<AuthLogoutPort> =
  new InjectionToken<AuthLogoutPort>('AUTH_LOGOUT_PORT');
