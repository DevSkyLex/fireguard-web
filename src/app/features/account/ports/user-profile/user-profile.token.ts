import { InjectionToken } from '@angular/core';
import type { UserProfilePort } from './user-profile.interface';

/**
 * Constant USER_PROFILE_PORT
 * @const USER_PROFILE_PORT
 *
 * @description
 * Injection token for the account-owned authenticated user profile contract.
 * Bound by `features/account/providers/` and consumed by approved external
 * workflows such as auth bootstrap.
 *
 * @type {InjectionToken<UserProfilePort>}
 */
export const USER_PROFILE_PORT: InjectionToken<UserProfilePort> = new InjectionToken<UserProfilePort>(
  'USER_PROFILE_PORT',
);
