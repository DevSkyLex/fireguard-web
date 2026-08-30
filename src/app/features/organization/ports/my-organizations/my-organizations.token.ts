import { InjectionToken } from '@angular/core';
import type { MyOrganizationsPort } from './my-organizations.interface';

/**
 * Constant MY_ORGANIZATIONS_PORT
 * @const MY_ORGANIZATIONS_PORT
 * @description Injection token for the organization-owned `MyOrganizationsPort`.
 */
export const MY_ORGANIZATIONS_PORT: InjectionToken<MyOrganizationsPort> =
  new InjectionToken<MyOrganizationsPort>('MY_ORGANIZATIONS_PORT');
