import { InjectionToken } from '@angular/core';
import type { LogoutProtectionPort } from './logout-protection.interface';

/**
 * Constant LOGOUT_PROTECTION_PORT
 *
 * @description
 * Auth-owned registration contract for local data protection during voluntary logout.
 */
export const LOGOUT_PROTECTION_PORT = new InjectionToken<LogoutProtectionPort>(
  'LOGOUT_PROTECTION_PORT',
);
