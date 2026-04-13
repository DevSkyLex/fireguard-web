import { InjectionToken } from '@angular/core';
import type { UserIdentityPort } from './user-identity.interface';

/**
 * Constant USER_IDENTITY_PORT
 * @const USER_IDENTITY_PORT
 *
 * @description
 * Injection token for the account-owned UserIdentityPort.
 * Bound by `features/account/providers/`.
 * Consumed by layouts and approved external consumers.
 *
 * @type {InjectionToken<UserIdentityPort>}
 */
export const USER_IDENTITY_PORT: InjectionToken<UserIdentityPort> =
  new InjectionToken<UserIdentityPort>('USER_IDENTITY_PORT');
