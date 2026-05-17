import { InjectionToken } from '@angular/core';
import type { AuthSessionPort } from './session.interface';

/**
 * Constant AUTH_SESSION_PORT
 * @const AUTH_SESSION_PORT
 *
 * @description
 * Injection token for the auth-owned AuthSessionPort.
 * Bound by `features/auth/providers/`.
 * Consumed by infrastructure and approved external consumers.
 *
 * @type {InjectionToken<AuthSessionPort>}
 */
export const AUTH_SESSION_PORT: InjectionToken<AuthSessionPort> =
  new InjectionToken<AuthSessionPort>('AUTH_SESSION_PORT');
