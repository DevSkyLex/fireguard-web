import { InjectionToken } from '@angular/core';
import type { UserAccessPort } from './user-access.interface';

/**
 * Constant USER_ACCESS_PORT
 * @const USER_ACCESS_PORT
 *
 * @description
 * Injection token for the account-owned UserAccessPort.
 */
export const USER_ACCESS_PORT: InjectionToken<UserAccessPort> = new InjectionToken<UserAccessPort>(
  'USER_ACCESS_PORT',
);
