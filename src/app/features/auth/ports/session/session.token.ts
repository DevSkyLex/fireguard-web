import { InjectionToken } from '@angular/core';
import type { AuthSessionPort } from './session.interface';

/**
 * Constant AUTH_SESSION
 * @const AUTH_SESSION
 *
 * @description
 * Injection token for the auth-owned AuthSessionPort.
 * Bound by `features/auth/providers/`.
 * Consumed by infrastructure and approved external consumers.
 *
 * @type {InjectionToken<AuthSessionPort>}
 */
export const AUTH_SESSION: InjectionToken<AuthSessionPort> =
  new InjectionToken<AuthSessionPort>('AUTH_SESSION');
